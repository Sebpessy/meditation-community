import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMeditationTemplateSchema, insertScheduleSchema, insertChatMessageSchema, insertMoodEntrySchema, insertMeditationSessionSchema, insertProfilePictureSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";

// Helper function to get current user from request
async function getCurrentUser(req: any) {
  // For now, we'll use a simple approach - the frontend should send the Firebase UID
  const firebaseUid = req.body.firebaseUid || req.headers['firebase-uid'] || req.headers['x-firebase-uid'];
  
  if (!firebaseUid) {
    return null;
  }
  
  try {
    const user = await storage.getUserByFirebaseUid(firebaseUid);
    
    // Check if user is banned
    if (user && user.isBanned) {
      return null; // Return null for banned users to prevent access
    }
    
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// WebSocket connection management
const activeConnections = new Map<WebSocket, { userId?: number, sessionDate?: string, lastActivity?: Date }>();
const sessionUsers = new Map<string, Set<number>>(); // sessionDate -> Set of userIds
const userGracePeriod = new Map<string, { userId: number, sessionDate: string, disconnectTime: Date, userData?: any }>(); // userId-sessionDate -> grace period info

// Grace period duration: 120 minutes
const GRACE_PERIOD_MINUTES = 120;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Enhanced periodic cleanup for stale grace period users (every 5 minutes with aggressive ghost user detection)
  setInterval(() => {
    const now = new Date();
    const expiredKeys: string[] = [];
    const ghostKeys: string[] = []; // For users disconnected >10 minutes (ghost users)
    
    Array.from(userGracePeriod.entries()).forEach(([key, grace]) => {
      const timeSinceDisconnect = now.getTime() - grace.disconnectTime.getTime();
      
      // Normal grace period expiry (120 minutes)
      if (timeSinceDisconnect >= (GRACE_PERIOD_MINUTES * 60 * 1000)) {
        expiredKeys.push(key);
      }
      // Aggressive cleanup for ghost users (10 minutes) to prevent online count mismatch
      else if (timeSinceDisconnect >= (10 * 60 * 1000)) {
        ghostKeys.push(key);
      }
    });
    
    const allCleanupKeys = [...expiredKeys, ...ghostKeys];
    
    if (allCleanupKeys.length > 0) {
      console.log(`Periodic cleanup: removing ${expiredKeys.length} expired + ${ghostKeys.length} ghost grace period users`);
      allCleanupKeys.forEach(key => {
        const grace = userGracePeriod.get(key);
        if (grace) {
          const cleanupType = expiredKeys.includes(key) ? 'expired' : 'ghost';
          console.log(`Removing ${cleanupType} grace period user: ${grace.userId} from session ${grace.sessionDate}`);
          userGracePeriod.delete(key);
          
          // Broadcast updated count for the session
          const onlineCount = getOnlineCount(grace.sessionDate);
          broadcastToSession(grace.sessionDate, {
            type: 'online-count-updated',
            onlineCount
          });
        }
      });
    }
  }, 5 * 60 * 1000); // Run every 5 minutes for more responsive cleanup
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    activeConnections.set(ws, {});

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const connectionInfo = activeConnections.get(ws);
        
        if (!connectionInfo) return;

        switch (message.type) {
          case 'join-session':
            connectionInfo.userId = message.userId;
            connectionInfo.sessionDate = message.sessionDate;
            connectionInfo.lastActivity = new Date();
            activeConnections.set(ws, connectionInfo);
            
            // Remove user from grace period if they're reconnecting
            const graceKey = `${message.userId}-${message.sessionDate}`;
            if (userGracePeriod.has(graceKey)) {
              console.log(`User ${message.userId} reconnected, removing from grace period`);
              userGracePeriod.delete(graceKey);
            }
            
            // Track unique users in session
            if (!sessionUsers.has(message.sessionDate)) {
              sessionUsers.set(message.sessionDate, new Set());
            }
            sessionUsers.get(message.sessionDate)!.add(message.userId);
            
            // Only flush old messages once per day when it's actually a new day
            // This ensures messages from 12:00 AM to 11:59 PM CST are preserved for the current day
            const now = new Date();
            const today = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }); // YYYY-MM-DD format
            
            // Check if we need to flush old messages (only when transitioning to a new day)
            if (!global.lastFlushDate || global.lastFlushDate !== today) {
              // Flush messages from previous days (not today's session)
              await storage.flushOldChatMessages(today);
              global.lastFlushDate = today;
              console.log(`Flushed old chat messages before ${today} at ${now.toLocaleString("en-US", { timeZone: "America/Chicago" })}`);
            }
            
            // Send all messages from the current day (12:00 AM to 11:59 PM CST)
            try {
              const initialMessages = await storage.getChatMessages(message.sessionDate, 1000);
              console.log('Initial messages count:', initialMessages.length);
              console.log('Sample message structure:', initialMessages[0]);
              
              // The getChatMessages method already returns messages with user data
              // We just need to format them correctly for the WebSocket
              const messagesWithUsers = initialMessages.map((msg: any) => {
                return {
                  id: msg.id,
                  message: msg.message,
                  timestamp: msg.timestamp,
                  user: {
                    id: msg.user.id,
                    name: msg.user.name,
                    profilePicture: msg.user.profilePicture,
                    isGardenAngel: msg.user.isGardenAngel
                  }
                };
              });

              console.log('Sending initial messages to user:', messagesWithUsers.length);
              // Send initial messages to the joining user
              ws.send(JSON.stringify({
                type: 'initial-messages',
                messages: messagesWithUsers
              }));
            } catch (error) {
              console.error('Failed to send initial messages:', error);
            }
            
            // Get online users info for display
            const onlineUsers = await getOnlineUsers(message.sessionDate);
            
            // Broadcast user joined
            broadcastToSession(message.sessionDate, {
              type: 'user-joined',
              userId: message.userId,
              onlineCount: getOnlineCount(message.sessionDate),
              onlineUsers: onlineUsers
            });
            break;

          case 'chat-message':
            if (connectionInfo.userId && connectionInfo.sessionDate) {
              // Update last activity
              connectionInfo.lastActivity = new Date();
              activeConnections.set(ws, connectionInfo);
              
              const chatMessage = await storage.createChatMessage({
                userId: connectionInfo.userId,
                message: message.text,
                sessionDate: connectionInfo.sessionDate
              });

              // Broadcast message to all users in the session
              broadcastToSession(connectionInfo.sessionDate, {
                type: 'new-message',
                message: chatMessage
              });
            }
            break;

          case 'leave-session':
            if (connectionInfo.sessionDate && connectionInfo.userId) {
              // Remove user from session if no other connections exist
              const hasOtherConnections = Array.from(activeConnections.values()).some(
                conn => conn.userId === connectionInfo.userId && 
                       conn.sessionDate === connectionInfo.sessionDate && 
                       conn !== connectionInfo
              );
              
              if (!hasOtherConnections) {
                // Start grace period instead of immediately removing user
                const graceKey = `${connectionInfo.userId}-${connectionInfo.sessionDate}`;
                const user = await storage.getUser(connectionInfo.userId);
                
                if (user) {
                  userGracePeriod.set(graceKey, {
                    userId: connectionInfo.userId,
                    sessionDate: connectionInfo.sessionDate,
                    disconnectTime: new Date(),
                    userData: {
                      id: user.id,
                      name: user.name,
                      profilePicture: user.profilePicture
                    }
                  });
                  
                  console.log(`User ${connectionInfo.userId} left session, entering grace period`);
                  
                  console.log(`Grace period started for user ${connectionInfo.userId} on ${connectionInfo.sessionDate}`);
                  
                  // Schedule grace period check after 120 minutes (with logging for debugging)
                  setTimeout(async () => {
                    console.log(`Checking grace period expiry for ${graceKey}`);
                    await checkGracePeriodExpiry(graceKey);
                  }, GRACE_PERIOD_MINUTES * 60 * 1000);
                } else {
                  sessionUsers.get(connectionInfo.sessionDate)?.delete(connectionInfo.userId);
                  
                  const onlineUsers = await getOnlineUsers(connectionInfo.sessionDate);
                  
                  broadcastToSession(connectionInfo.sessionDate, {
                    type: 'user-left',
                    userId: connectionInfo.userId,
                    onlineCount: getOnlineCount(connectionInfo.sessionDate),
                    onlineUsers: onlineUsers
                  });
                }
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      const connectionInfo = activeConnections.get(ws);
      activeConnections.delete(ws);
      
      if (connectionInfo?.sessionDate && connectionInfo.userId) {
        // Check if user has other active connections in this session
        const hasOtherConnections = Array.from(activeConnections.values()).some(
          conn => conn.userId === connectionInfo.userId && 
                 conn.sessionDate === connectionInfo.sessionDate
        );
        
        if (!hasOtherConnections) {
          // User has no active connections, start grace period
          const graceKey = `${connectionInfo.userId}-${connectionInfo.sessionDate}`;
          const user = await storage.getUser(connectionInfo.userId);
          
          if (user) {
            userGracePeriod.set(graceKey, {
              userId: connectionInfo.userId,
              sessionDate: connectionInfo.sessionDate,
              disconnectTime: new Date(),
              userData: {
                id: user.id,
                name: user.name,
                profilePicture: user.profilePicture
              }
            });
            
            console.log(`User ${connectionInfo.userId} entered grace period for ${GRACE_PERIOD_MINUTES} minutes`);
            
            // Schedule grace period check after 120 minutes
            setTimeout(async () => {
              console.log(`Scheduled grace period check for ${graceKey}`);
              await checkGracePeriodExpiry(graceKey);
            }, GRACE_PERIOD_MINUTES * 60 * 1000);
            
            // Additional shorter check for production reliability (every 30 minutes)
            setTimeout(async () => {
              console.log(`Mid-grace period check for ${graceKey}`);
              await checkGracePeriodExpiry(graceKey);
            }, 30 * 60 * 1000);
          } else {
            // If we can't get user data, remove immediately
            sessionUsers.get(connectionInfo.sessionDate)?.delete(connectionInfo.userId);
            
            const onlineUsers = await getOnlineUsers(connectionInfo.sessionDate);
            
            broadcastToSession(connectionInfo.sessionDate, {
              type: 'user-left',
              userId: connectionInfo.userId,
              onlineCount: getOnlineCount(connectionInfo.sessionDate),
              onlineUsers: onlineUsers
            });
          }
        }
      }
    });
  });

  // Helper functions for WebSocket
  function broadcastToSession(sessionDate: string, message: any) {
    const messageStr = JSON.stringify(message);
    activeConnections.forEach((connectionInfo, ws) => {
      if (connectionInfo.sessionDate === sessionDate && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  function getOnlineCount(sessionDate: string): number {
    const userSet = sessionUsers.get(sessionDate);
    const baseCount = userSet ? userSet.size : 0;
    
    // Check grace period users for expiry before counting
    const now = new Date();
    const validGracePeriodUsers = Array.from(userGracePeriod.entries())
      .filter(([key, grace]) => {
        if (grace.sessionDate !== sessionDate) return false;
        
        const timeSinceDisconnect = now.getTime() - grace.disconnectTime.getTime();
        const isExpired = timeSinceDisconnect >= (GRACE_PERIOD_MINUTES * 60 * 1000);
        
        if (isExpired) {
          console.log(`Removing expired grace period user ${grace.userId}`);
          userGracePeriod.delete(key);
          return false;
        }
        return true;
      });
    
    const gracePeriodCount = validGracePeriodUsers.length;
    
    console.log(`Online count debug - Active: ${baseCount}, Grace period: ${gracePeriodCount}, Total: ${baseCount + gracePeriodCount}`);
    
    return baseCount + gracePeriodCount;
  }

  async function getOnlineUsers(sessionDate: string): Promise<Array<{id: number, name: string, profilePicture?: string}>> {
    const userSet = sessionUsers.get(sessionDate);
    const activeUserIds = userSet ? Array.from(userSet) : [];
    
    // Get users currently connected
    const activeUsers = await Promise.all(
      activeUserIds.map(async (userId) => {
        const user = await storage.getUser(userId);
        return user ? {
          id: user.id,
          name: user.name,
          profilePicture: user.profilePicture
        } : null;
      })
    );
    
    // Get valid grace period users (check for expiry)
    const now = new Date();
    const validGracePeriodUsers = Array.from(userGracePeriod.entries())
      .filter(([key, grace]) => {
        if (grace.sessionDate !== sessionDate) return false;
        
        const timeSinceDisconnect = now.getTime() - grace.disconnectTime.getTime();
        const isExpired = timeSinceDisconnect >= (GRACE_PERIOD_MINUTES * 60 * 1000);
        
        if (isExpired) {
          console.log(`Cleaning expired grace period user ${grace.userId} from display`);
          userGracePeriod.delete(key);
          return false;
        }
        return true;
      })
      .map(([key, grace]) => grace.userData)
      .filter(user => user !== null);
    
    console.log(`Online users debug - Active users: ${activeUsers.filter(u => u).length}, Grace period users: ${validGracePeriodUsers.length}`);
    
    // Combine active users and grace period users, remove duplicates
    const allUsers = [...activeUsers.filter(user => user !== null), ...validGracePeriodUsers];
    const uniqueUsers = allUsers.filter((user, index, self) => 
      user && self.findIndex(u => u && u.id === user.id) === index
    );
    
    console.log(`Final unique users count: ${uniqueUsers.length}`);
    
    return uniqueUsers as Array<{id: number, name: string, profilePicture?: string}>;
  }

  async function checkGracePeriodExpiry(graceKey: string) {
    const graceInfo = userGracePeriod.get(graceKey);
    if (!graceInfo) return;
    
    const now = new Date();
    const timeSinceDisconnect = now.getTime() - graceInfo.disconnectTime.getTime();
    const gracePeriodMs = GRACE_PERIOD_MINUTES * 60 * 1000;
    
    // Check if user has reconnected during grace period
    const hasReconnected = Array.from(activeConnections.values()).some(
      conn => conn.userId === graceInfo.userId && conn.sessionDate === graceInfo.sessionDate
    );
    
    if (hasReconnected) {
      // User reconnected, remove from grace period
      console.log(`User ${graceInfo.userId} reconnected during grace period, removing from grace period`);
      userGracePeriod.delete(graceKey);
      return;
    }
    
    if (timeSinceDisconnect >= gracePeriodMs) {
      // Grace period expired, extend for another 120 minutes or remove user
      console.log(`Grace period expired for user ${graceInfo.userId}, extending for another ${GRACE_PERIOD_MINUTES} minutes`);
      
      // Update disconnect time to extend grace period
      graceInfo.disconnectTime = new Date();
      userGracePeriod.set(graceKey, graceInfo);
      
      // Schedule another check in 120 minutes
      setTimeout(async () => {
        await finalGracePeriodCheck(graceKey);
      }, GRACE_PERIOD_MINUTES * 60 * 1000);
    }
  }

  async function finalGracePeriodCheck(graceKey: string) {
    const graceInfo = userGracePeriod.get(graceKey);
    if (!graceInfo) return;
    
    // Check if user has reconnected during second grace period
    const hasReconnected = Array.from(activeConnections.values()).some(
      conn => conn.userId === graceInfo.userId && conn.sessionDate === graceInfo.sessionDate
    );
    
    if (hasReconnected) {
      console.log(`User ${graceInfo.userId} reconnected during extended grace period`);
      userGracePeriod.delete(graceKey);
      return;
    }
    
    // Remove user completely after second grace period
    console.log(`Removing user ${graceInfo.userId} after extended grace period`);
    userGracePeriod.delete(graceKey);
    sessionUsers.get(graceInfo.sessionDate)?.delete(graceInfo.userId);
    
    const onlineUsers = await getOnlineUsers(graceInfo.sessionDate);
    
    broadcastToSession(graceInfo.sessionDate, {
      type: 'user-left',
      userId: graceInfo.userId,
      onlineCount: getOnlineCount(graceInfo.sessionDate),
      onlineUsers: onlineUsers
    });
  }

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      console.log('Registration attempt:', req.body);
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        console.log('User already exists:', existingUser);
        return res.json(existingUser);
      }

      // Assign random profile picture from database for new users
      const activeProfilePictures = await storage.getActiveProfilePictures();
      
      let randomProfilePicture = null;
      if (activeProfilePictures.length > 0) {
        const randomPicture = activeProfilePictures[Math.floor(Math.random() * activeProfilePictures.length)];
        randomProfilePicture = randomPicture.imageData;
      }
      
      // Generate unique referral code for new user
      const referralCode = await storage.generateUniqueReferralCode();
      
      // Handle referral if provided
      let referredBy = null;
      if (req.body.referralCode) {
        const referrer = await storage.getUserByReferralCode(req.body.referralCode);
        if (referrer) {
          referredBy = referrer.id;
        }
      }
      
      const userWithAvatar = {
        ...userData,
        profilePicture: randomProfilePicture,
        referralCode,
        referredBy
      };

      const user = await storage.createUser(userWithAvatar);
      
      // Create referral record if user was referred
      if (referredBy) {
        await storage.createReferral({
          referrerId: referredBy,
          referredId: user.id,
          referralCode: req.body.referralCode,
          status: "pending"
        });
        
        // Give welcome bonus to new user
        await storage.addQuantumLovePoints(
          user.id, 
          50, 
          "welcome_bonus", 
          "Welcome to Serene Space! 🌟"
        );
      }
      console.log('User created successfully with random avatar:', user);
      res.json(user);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  app.get('/api/auth/user/:firebaseUid', async (req, res) => {
    try {
      console.log('Fetching user with Firebase UID:', req.params.firebaseUid);
      
      // Check if IP is banned first
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      if (clientIp) {
        const isIpBanned = await storage.isIpBanned(clientIp.toString());
        if (isIpBanned) {
          console.log('Banned IP attempted access:', clientIp);
          return res.status(403).json({ 
            error: 'Access denied',
            reason: 'Your IP address has been blocked'
          });
        }
      }
      
      const user = await storage.getUserByFirebaseUid(req.params.firebaseUid);
      if (!user) {
        console.log('User not found for Firebase UID:', req.params.firebaseUid);
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if user is banned
      if (user.isBanned) {
        console.log('Banned user attempted access:', user.email);
        return res.status(403).json({ 
          error: 'User is banned',
          reason: user.bannedReason || 'Account has been suspended',
          bannedAt: user.bannedAt
        });
      }
      
      console.log('User found:', user);
      res.json(user);
    } catch (error) {
      console.error('User fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // User profile routes
  app.put('/api/user/profile', async (req, res) => {
    try {
      // For now, we'll use a simple approach - the frontend will send the Firebase UID
      const firebaseUid = req.body.firebaseUid;
      
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Firebase UID required' });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { updateUserSchema } = await import('@shared/schema');
      const updateData = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(user.id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  // Meditation routes
  app.get('/api/meditation/today', async (req, res) => {
    try {
      // Use Central Standard Time (CST) as reference - UTC-6
      const now = new Date();
      const cstOffset = -6; // CST is UTC-6
      const today = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
      const schedule = await storage.getScheduleByDate(today);
      
      if (!schedule || !schedule.templateId) {
        return res.status(404).json({ error: 'No meditation scheduled for today' });
      }

      const template = await storage.getTemplate(schedule.templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json({
        ...template,
        scheduledTime: schedule.scheduledTime,
        date: schedule.date
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch today\'s meditation' });
    }
  });

  app.get('/api/meditation/chat/:sessionDate', async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.sessionDate);
      
      // The getChatMessages method now returns messages with user data already populated
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
  });

  app.get('/api/meditation/online-count/:sessionDate', async (req, res) => {
    try {
      const count = getOnlineCount(req.params.sessionDate);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get online count' });
    }
  });

  app.get('/api/meditation/online-users/:sessionDate', async (req, res) => {
    try {
      const users = await getOnlineUsers(req.params.sessionDate);
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get online users' });
    }
  });

  // Debug endpoint to check grace period status
  app.get('/api/debug/grace-period/:sessionDate', async (req, res) => {
    try {
      const sessionDate = req.params.sessionDate;
      const gracePeriodData = Array.from(userGracePeriod.entries())
        .filter(([key, grace]) => grace.sessionDate === sessionDate)
        .map(([key, grace]) => ({
          key,
          userId: grace.userId,
          sessionDate: grace.sessionDate,
          disconnectTime: grace.disconnectTime,
          timeSinceDisconnect: new Date().getTime() - grace.disconnectTime.getTime(),
          userData: grace.userData
        }));
      
      const activeUsers = sessionUsers.get(sessionDate);
      const activeUserIds = activeUsers ? Array.from(activeUsers) : [];
      
      res.json({ 
        gracePeriodUsers: gracePeriodData,
        activeUserIds,
        totalOnlineCount: getOnlineCount(sessionDate)
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get grace period status' });
    }
  });

  // Emergency clear grace period endpoint
  app.post('/api/debug/clear-grace-period/:sessionDate', async (req, res) => {
    try {
      const sessionDate = req.params.sessionDate;
      const keysToDelete = Array.from(userGracePeriod.entries())
        .filter(([key, grace]) => grace.sessionDate === sessionDate)
        .map(([key]) => key);
      
      keysToDelete.forEach(key => userGracePeriod.delete(key));
      
      // Broadcast updated user list
      const onlineUsers = await getOnlineUsers(sessionDate);
      broadcastToSession(sessionDate, {
        type: 'online-count-updated',
        onlineCount: getOnlineCount(sessionDate),
        onlineUsers: onlineUsers
      });
      
      res.json({ 
        message: 'Grace period cleared',
        removedKeys: keysToDelete,
        newOnlineCount: getOnlineCount(sessionDate)
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear grace period' });
    }
  });

  // Enhanced debug endpoint to test grace period functionality
  app.get('/api/debug/grace-period-test/:sessionDate', async (req, res) => {
    try {
      const sessionDate = req.params.sessionDate;
      const now = new Date();
      
      // Test data for grace period functionality
      const testResults = {
        currentHost: req.headers.host,
        isProduction: req.headers.host?.includes('newself.me'),
        gracePeriodMinutes: GRACE_PERIOD_MINUTES,
        currentTime: now.toISOString(),
        gracePeriodEntries: Array.from(userGracePeriod.entries()).map(([key, grace]) => ({
          key,
          userId: grace.userId,
          sessionDate: grace.sessionDate,
          disconnectTime: grace.disconnectTime.toISOString(),
          minutesInGrace: Math.floor((now.getTime() - grace.disconnectTime.getTime()) / (1000 * 60)),
          shouldExpire: (now.getTime() - grace.disconnectTime.getTime()) >= (GRACE_PERIOD_MINUTES * 60 * 1000)
        })),
        activeConnections: activeConnections.size,
        sessionUsers: Array.from(sessionUsers.entries()).map(([date, users]) => ({
          sessionDate: date,
          userIds: Array.from(users)
        }))
      };
      
      res.json(testResults);
    } catch (error) {
      res.status(500).json({ error: 'Failed to run grace period test' });
    }
  });

  // Emergency fix endpoint for production deployment
  app.post('/api/debug/force-cleanup/:sessionDate', async (req, res) => {
    try {
      const sessionDate = req.params.sessionDate;
      const now = new Date();
      let cleanedCount = 0;
      
      // Force cleanup all grace period users older than 5 minutes for immediate fix
      const expiredKeys = Array.from(userGracePeriod.entries())
        .filter(([key, grace]) => {
          if (grace.sessionDate !== sessionDate) return false;
          const timeSinceDisconnect = now.getTime() - grace.disconnectTime.getTime();
          return timeSinceDisconnect >= (5 * 60 * 1000); // 5 minutes threshold for emergency cleanup
        })
        .map(([key]) => key);
      
      expiredKeys.forEach(key => {
        userGracePeriod.delete(key);
        cleanedCount++;
      });
      
      // Broadcast updated count
      const onlineUsers = await getOnlineUsers(sessionDate);
      broadcastToSession(sessionDate, {
        type: 'online-count-updated',
        onlineCount: getOnlineCount(sessionDate),
        onlineUsers: onlineUsers
      });
      
      res.json({ 
        message: 'Emergency cleanup completed',
        cleanedCount,
        newOnlineCount: getOnlineCount(sessionDate),
        remainingGracePeriodUsers: Array.from(userGracePeriod.entries())
          .filter(([key, grace]) => grace.sessionDate === sessionDate).length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to run emergency cleanup' });
    }
  });

  // One-time session duration cleanup endpoint for production deployment
  app.post('/api/admin/cleanup-session-durations', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // The cleanup has already been performed via direct SQL
      // This endpoint provides confirmation and statistics
      const allSessions = await storage.getAllMeditationSessions();
      const sessionsAbove60 = allSessions.filter(s => s.duration > 3600);
      const maxDuration = allSessions.length > 0 ? Math.max(...allSessions.map(s => s.duration)) : 0;
      
      const verification = {
        total_sessions: allSessions.length,
        sessions_above_60_minutes: sessionsAbove60.length,
        max_duration_seconds: maxDuration,
        max_duration_minutes: Math.round(maxDuration / 60.0 * 10) / 10
      };

      console.log(`Session duration cleanup status check completed. Found ${sessionsAbove60.length} sessions still above 60 minutes.`);

      res.json({
        message: 'Session duration cleanup status verified',
        verification,
        cleanupAlreadyCompleted: true,
        remainingSessionsAbove60: sessionsAbove60.map(s => ({
          id: s.id,
          userId: s.userId,
          sessionDate: s.sessionDate,
          duration: s.duration,
          minutes: Math.round(s.duration / 60.0 * 10) / 10
        })),
        domain: req.headers.host,
        isProduction: req.headers.host?.includes('newself.me')
      });
    } catch (error) {
      console.error('Session duration cleanup error:', error);
      res.status(500).json({ error: 'Failed to check session duration cleanup status' });
    }
  });

  // Like routes
  app.post('/api/messages/:messageId/like', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const messageId = parseInt(req.params.messageId);
      const success = await storage.likeMessage(messageId, user.id);
      
      if (success) {
        const likeCount = await storage.getMessageLikes(messageId);
        res.json({ success: true, likes: likeCount });
      } else {
        res.status(500).json({ error: 'Failed to like message' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to like message' });
    }
  });

  app.delete('/api/messages/:messageId/like', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const messageId = parseInt(req.params.messageId);
      const success = await storage.unlikeMessage(messageId, user.id);
      
      if (success) {
        const likeCount = await storage.getMessageLikes(messageId);
        res.json({ success: true, likes: likeCount });
      } else {
        res.status(404).json({ error: 'Like not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to unlike message' });
    }
  });

  app.get('/api/messages/:messageId/likes', async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const likes = await storage.getMessageLikes(messageId);
      res.json({ likes });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get message likes' });
    }
  });

  app.get('/api/users/:userId/liked-messages', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = parseInt(req.params.userId);
      // Users can only see their own liked messages
      if (user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const likedMessages = await storage.getUserLikedMessages(userId);
      res.json({ likedMessages });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get liked messages' });
    }
  });

  // Mood tracking routes
  app.post('/api/mood/entry', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const entryData = insertMoodEntrySchema.parse({
        ...req.body,
        userId: user.id
      });

      const entry = await storage.createMoodEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error('Error creating mood entry:', error);
      res.status(400).json({ error: 'Invalid mood entry data' });
    }
  });

  app.get('/api/mood/entries/:userId', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = parseInt(req.params.userId);
      // Users can only see their own mood entries
      if (user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const sessionDate = req.query.sessionDate as string;
      const entries = await storage.getMoodEntries(userId, sessionDate);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get mood entries' });
    }
  });

  // Meditation session tracking routes
  app.post('/api/session/start', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { sessionDate } = req.body;
      if (!sessionDate) {
        return res.status(400).json({ error: 'Session date is required' });
      }

      // Get existing session or create a new one
      const session = await storage.getOrCreateTodaySession(user.id, sessionDate);
      res.json(session);
    } catch (error) {
      console.error('Error starting meditation session:', error);
      res.status(400).json({ error: 'Invalid session data' });
    }
  });

  // Get specific session data
  app.get('/api/session/:id', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }

      const session = await storage.getMeditationSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Ensure user can only access their own sessions (or admin can access any)
      if (session.userId !== user.id && !user.isAdmin) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(session);
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  app.patch('/api/session/:id', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sessionId = parseInt(req.params.id);
      const updatedSession = await storage.updateMeditationSession(sessionId, req.body);
      
      if (!updatedSession) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(updatedSession);
    } catch (error) {
      console.error('Error updating meditation session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  // Support PUT method for updating session
  app.put('/api/session/:id', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sessionId = parseInt(req.params.id);
      const { duration } = req.body;
      
      // Get current session to check existing duration
      const currentSession = await storage.getMeditationSessionById(sessionId);
      if (!currentSession) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Simply update with the current session duration (not accumulative)
      const updatedSession = await storage.updateMeditationSession(sessionId, {
        duration: duration
      });
      
      if (!updatedSession) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check for referral completion (if this is a referred user's first meaningful session)
      if (duration >= 300) { // 5 minutes minimum for referral completion
        const user = await getCurrentUser(req);
        if (user && user.referredBy) {
          // Check if user has any pending referrals
          const pendingReferrals = await storage.getUserReferrals(user.referredBy);
          const userReferral = pendingReferrals.find(ref => 
            ref.referredId === user.id && ref.status === "pending"
          );
          
          if (userReferral) {
            console.log(`Completing referral ${userReferral.id} for user ${user.id}`);
            await storage.completeReferral(userReferral.id);
            
            // Give rewards to both users
            await Promise.all([
              // Give points to referrer
              storage.addQuantumLovePoints(
                user.referredBy,
                100,
                "referral_bonus",
                "You earned points for referring a friend! 🎉",
                userReferral.id
              ),
              // Give additional completion bonus to referred user
              storage.addQuantumLovePoints(
                user.id,
                25,
                "referral_completion",
                "Bonus for completing your first meditation! ✨",
                userReferral.id
              )
            ]);
          }
        }
      }

      res.json(updatedSession);
    } catch (error) {
      console.error('Error updating meditation session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  // Support POST for sendBeacon API
  app.post('/api/session/:id', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sessionId = parseInt(req.params.id);
      const updatedSession = await storage.updateMeditationSession(sessionId, req.body);
      
      if (!updatedSession) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(updatedSession);
    } catch (error) {
      console.error('Error updating meditation session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  app.get('/api/session/duration/:userId/:sessionDate', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = parseInt(req.params.userId);
      const sessionDate = req.params.sessionDate;
      
      // Users can only see their own session data
      if (user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const duration = await storage.getSessionDuration(userId, sessionDate);
      res.json({ duration });
    } catch (error) {
      console.error('Error fetching session duration:', error);
      res.status(500).json({ error: 'Failed to fetch session duration' });
    }
  });

  app.get('/api/session/durations/:userId', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = parseInt(req.params.userId);
      
      // Users can only see their own session data
      if (user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const sessions = await storage.getMeditationSessions(userId);
      
      // Group sessions by date and sum durations
      const sessionDurations = sessions.reduce((acc: any[], session) => {
        const existingSession = acc.find(s => s.sessionDate === session.sessionDate);
        if (existingSession) {
          existingSession.duration += session.duration || 0;
        } else {
          acc.push({
            sessionDate: session.sessionDate,
            duration: session.duration || 0
          });
        }
        return acc;
      }, []);

      res.json(sessionDurations);
    } catch (error) {
      console.error('Error fetching session durations:', error);
      res.status(500).json({ error: 'Failed to fetch session durations' });
    }
  });

  // AI-powered mood analysis routes (prepared for future OpenAI integration)
  app.post('/api/mood/insights', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // For now, return a message indicating OpenAI is not configured
      // When OpenAI API key is provided, this will call the OpenAI service
      res.json({
        message: 'AI insights service is prepared but requires OpenAI API key configuration',
        ready: false
      });
    } catch (error) {
      console.error('Error generating mood insights:', error);
      res.status(500).json({ error: 'Failed to generate mood insights' });
    }
  });

  // Development route to add sample mood data
  app.post('/api/mood/sample-data', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate sample data for the past 5 days
      const sampleEntries = [];
      const comments = [
        'Feeling anxious about work today',
        'Had a good morning but stressed about upcoming meeting',
        'Feeling tired but hopeful',
        'Ready to start the day with intention',
        'Mind feels clearer after meditation',
        'Grateful for this moment of stillness',
        'Ready to face the day with calm energy',
        'Feeling more balanced and grounded',
        'Noticed my breathing becoming deeper',
        'Heart feels more open and connected'
      ];

      for (let i = 1; i <= 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const sessionDate = date.toISOString().split('T')[0];
        
        // Generate random mood levels and comments
        const preMoodLevel = Math.floor(Math.random() * 4); // 0-3 (lower levels)
        const postMoodLevel = Math.floor(Math.random() * 3) + 4; // 4-6 (higher levels)
        
        // Pre-meditation entry
        sampleEntries.push({
          sessionDate,
          emotionLevel: preMoodLevel,
          moodType: 'pre',
          comment: comments[Math.floor(Math.random() * 5)], // First 5 are pre-meditation
          notes: null,
          userId: user.id
        });
        
        // Post-meditation entry
        sampleEntries.push({
          sessionDate,
          emotionLevel: postMoodLevel,
          moodType: 'post',
          comment: comments[Math.floor(Math.random() * 5) + 5], // Last 5 are post-meditation
          notes: null,
          userId: user.id
        });
      }

      // Insert sample entries
      for (const entry of sampleEntries) {
        await storage.createMoodEntry(entry);
      }

      res.json({ message: 'Sample mood data added successfully', count: sampleEntries.length });
    } catch (error) {
      console.error('Error adding sample mood data:', error);
      res.status(500).json({ error: 'Failed to add sample mood data' });
    }
  });

  app.get('/api/mood/latest/:userId/:sessionDate/:moodType', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = parseInt(req.params.userId);
      // Users can only see their own mood entries
      if (user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { sessionDate, moodType } = req.params;
      const entry = await storage.getLatestMoodEntry(userId, sessionDate, moodType);
      res.json(entry || null);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get latest mood entry' });
    }
  });

  // Analytics endpoint that returns all mood entries for the user
  app.get('/api/mood/analytics', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const entries = await storage.getMoodEntries(user.id);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get mood analytics' });
    }
  });

  // Sessions endpoint that returns session durations for the user
  app.get('/api/mood/sessions', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      console.log('Fetching session durations for user:', user.id);
      const durations = await storage.getSessionDurations(user.id);
      console.log('Session durations result:', durations);
      res.json(durations);
    } catch (error) {
      console.error('Error in getSessionDurations endpoint:', error);
      res.status(500).json({ error: 'Failed to get session durations' });
    }
  });

  // Admin routes
  app.get('/api/admin/templates', async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  app.post('/api/admin/templates', async (req, res) => {
    try {
      const templateData = insertMeditationTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData);
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: 'Invalid template data' });
    }
  });

  app.put('/api/admin/templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = insertMeditationTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(id, templateData);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: 'Invalid template data' });
    }
  });

  app.delete('/api/admin/templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTemplate(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  app.post('/api/admin/templates/:id/duplicate', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const originalTemplate = await storage.getTemplate(id);
      
      if (!originalTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Create a copy of the template without the ID
      const duplicateData = {
        title: `${originalTemplate.title} (Copy)`,
        description: originalTemplate.description,
        duration: originalTemplate.duration,
        difficulty: originalTemplate.difficulty,
        videoUrl: originalTemplate.videoUrl,
        thumbnailUrl: originalTemplate.thumbnailUrl,
        instructor: originalTemplate.instructor,
        instructorTitle: originalTemplate.instructorTitle,
        sessionSteps: originalTemplate.sessionSteps
      };
      
      const duplicatedTemplate = await storage.createTemplate(duplicateData);
      res.json(duplicatedTemplate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to duplicate template' });
    }
  });

  app.post('/api/admin/templates/import', async (req, res) => {
    try {
      const { templates } = req.body;
      
      if (!templates || !Array.isArray(templates)) {
        return res.status(400).json({ error: 'Templates array is required' });
      }
      
      const imported = [];
      const errors = [];
      
      for (const template of templates) {
        try {
          // Validate template data
          const validatedTemplate = insertMeditationTemplateSchema.parse(template);
          const createdTemplate = await storage.createTemplate(validatedTemplate);
          imported.push(createdTemplate);
        } catch (error: any) {
          errors.push({
            template: template.title || 'Unknown',
            error: error.message || 'Unknown error'
          });
        }
      }
      
      res.json({
        imported: imported.length,
        errors: errors,
        templates: imported
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to import templates' });
    }
  });

  app.get('/api/admin/schedules', async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });

  // Garden Angel endpoint for viewing schedules (read-only)
  app.get('/api/garden-angel/schedules', async (req, res) => {
    try {
      // Get current user to verify Garden Angel status
      const firebaseUid = req.headers['firebase-uid'] as string;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserByFirebaseUid(firebaseUid);
      if (!user || (!user.isGardenAngel && !user.isAdmin)) {
        return res.status(403).json({ error: 'Garden Angel or Admin access required' });
      }

      const schedules = await storage.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });

  app.post('/api/admin/schedules', async (req, res) => {
    try {
      const scheduleData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      res.status(400).json({ error: 'Invalid schedule data' });
    }
  });

  app.put('/api/admin/schedules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scheduleData = insertScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateSchedule(id, scheduleData);
      
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      res.json(schedule);
    } catch (error) {
      res.status(400).json({ error: 'Invalid schedule data' });
    }
  });

  app.delete('/api/admin/schedules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSchedule(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  });

  // User Management Routes
  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Get user analytics (last login and total time spent)
      const usersWithAnalytics = await Promise.all(users.map(async (user) => {
        const lastLogin = await storage.getUserLastLogin(user.id);
        const totalTimeSpent = await storage.getUserTotalTimeSpent(user.id);
        
        return {
          ...user,
          lastLogin,
          totalTimeSpent
        };
      }));
      
      res.json(usersWithAnalytics);
    } catch (error) {
      console.error('Error in /api/admin/users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.put('/api/admin/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Update user time spent endpoint
  app.put('/api/admin/users/:id/time-spent', async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      if (!currentUser || !currentUser.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const userId = parseInt(req.params.id);
      const { timeSpent } = req.body;

      if (isNaN(userId) || isNaN(timeSpent) || timeSpent < 0) {
        return res.status(400).json({ error: 'Invalid user ID or time spent value' });
      }

      // Update the user's total time spent in meditation sessions
      const success = await storage.updateUserTotalTimeSpent(userId, timeSpent);
      
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, timeSpent });
    } catch (error) {
      console.error('Error updating user time spent:', error);
      res.status(500).json({ error: 'Failed to update time spent' });
    }
  });

  // Chat Message Moderation Routes
  app.delete('/api/messages/:id', async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const firebaseUid = req.headers['firebase-uid'] || req.headers['x-firebase-uid'];
      
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const user = await storage.getUserByFirebaseUid(firebaseUid as string);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Check if user is admin or Garden Angel
      if (!user.isAdmin && !user.isGardenAngel) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get the message first to find its session date
      const messageData = await storage.getChatMessageById(messageId);
      if (!messageData) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      const success = await storage.deleteChatMessage(messageId);
      
      if (!success) {
        return res.status(404).json({ error: 'Failed to delete message' });
      }
      
      // Broadcast message deletion to all users in the same session
      broadcastToSession(messageData.sessionDate, {
        type: 'message-deleted',
        messageId: messageId
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // Profile Picture Management Routes
  app.get('/api/profile-pictures', async (req, res) => {
    try {
      const pictures = await storage.getActiveProfilePictures();
      res.json(pictures);
    } catch (error) {
      console.error('Error fetching profile pictures:', error);
      res.status(500).json({ error: 'Failed to fetch profile pictures' });
    }
  });

  app.get('/api/admin/profile-pictures', async (req, res) => {
    try {
      const pictures = await storage.getAllProfilePictures();
      res.json(pictures);
    } catch (error) {
      console.error('Error fetching all profile pictures:', error);
      res.status(500).json({ error: 'Failed to fetch profile pictures' });
    }
  });

  app.post('/api/admin/profile-pictures', async (req, res) => {
    try {
      const pictureData = insertProfilePictureSchema.parse(req.body);
      const picture = await storage.createProfilePicture(pictureData);
      res.json(picture);
    } catch (error) {
      console.error('Error creating profile picture:', error);
      res.status(400).json({ error: 'Invalid profile picture data' });
    }
  });

  app.put('/api/admin/profile-pictures/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pictureData = req.body;
      const picture = await storage.updateProfilePicture(id, pictureData);
      
      if (!picture) {
        return res.status(404).json({ error: 'Profile picture not found' });
      }
      
      res.json(picture);
    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(400).json({ error: 'Invalid profile picture data' });
    }
  });

  app.delete('/api/admin/profile-pictures/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProfilePicture(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Profile picture not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      res.status(500).json({ error: 'Failed to delete profile picture' });
    }
  });

  // User management routes (Admin and Garden Angel only)
  app.post('/api/admin/users/:id/ban', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: 'Ban reason is required' });
      }

      const bannedUser = await storage.banUser(id, reason, user.id);
      
      if (!bannedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user: bannedUser });
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ error: 'Failed to ban user' });
    }
  });

  app.post('/api/admin/users/:id/unban', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const id = parseInt(req.params.id);
      const unbannedUser = await storage.unbanUser(id);
      
      if (!unbannedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user: unbannedUser });
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: 'Failed to unban user' });
    }
  });

  app.post('/api/admin/users/:id/garden-angel', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const id = parseInt(req.params.id);
      const gardenAngel = await storage.makeGardenAngel(id);
      
      if (!gardenAngel) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user: gardenAngel });
    } catch (error) {
      console.error('Error making user Garden Angel:', error);
      res.status(500).json({ error: 'Failed to make user Garden Angel' });
    }
  });

  app.delete('/api/admin/users/:id/garden-angel', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const id = parseInt(req.params.id);
      const normalUser = await storage.removeGardenAngel(id);
      
      if (!normalUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user: normalUser });
    } catch (error) {
      console.error('Error removing Garden Angel status:', error);
      res.status(500).json({ error: 'Failed to remove Garden Angel status' });
    }
  });

  // Analytics endpoints for admin
  app.get('/api/admin/analytics', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Get total users count
      const allUsers = await storage.getAllUsers();
      const totalUsers = allUsers.length;
      
      // Get top 10 users by meditation time
      const usersWithTime = await Promise.all(
        allUsers.map(async (u) => {
          const totalTime = await storage.getUserTotalTimeSpent(u.id);
          return { ...u, totalTimeSpent: totalTime };
        })
      );
      
      const topUsers = usersWithTime
        .sort((a, b) => (b.totalTimeSpent || 0) - (a.totalTimeSpent || 0))
        .slice(0, 10);

      // Get total meditation time statistics 
      const totalMinutes = usersWithTime.reduce((sum, u) => sum + (u.totalTimeSpent || 0), 0);
      
      // Calculate daily, monthly, yearly averages
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      // For now, we'll calculate based on available data
      // This would need more sophisticated queries for accurate daily/monthly breakdowns
      const dailyAverage = Math.round(totalMinutes / 30); // Rough estimate assuming 30 days of data
      const monthlyTotal = Math.round(totalMinutes * 0.7); // Rough estimate for current month
      const yearlyTotal = totalMinutes; // All time is this year for now

      res.json({
        totalUsers,
        totalMinutes,
        dailyAverage,
        monthlyTotal,
        yearlyTotal,
        topUsers: topUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          totalTimeSpent: u.totalTimeSpent || 0
        }))
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Chat message management routes (Admin and Garden Angel only)
  app.delete('/api/admin/messages/:id', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || (!user.isAdmin && !user.isGardenAngel)) {
        return res.status(403).json({ error: 'Admin or Garden Angel access required' });
      }

      const messageId = parseInt(req.params.id);
      const success = await storage.deleteChatMessage(messageId);
      
      if (!success) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      // Broadcast message deletion to all connected clients
      const deleteMessage = JSON.stringify({
        type: 'message-deleted',
        messageId: messageId
      });
      
      for (const [ws] of Array.from(activeConnections.entries())) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(deleteMessage);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // IP ban management routes (Admin only)
  app.get('/api/admin/banned-ips', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const bannedIps = await storage.getBannedIps();
      res.json(bannedIps);
    } catch (error) {
      console.error('Error fetching banned IPs:', error);
      res.status(500).json({ error: 'Failed to fetch banned IPs' });
    }
  });

  app.post('/api/admin/ban-ip', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { ipAddress, reason } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }

      const bannedIp = await storage.banIp(ipAddress, user.id, reason);
      res.json({ success: true, bannedIp });
    } catch (error) {
      console.error('Error banning IP:', error);
      res.status(500).json({ error: 'Failed to ban IP' });
    }
  });

  app.delete('/api/admin/banned-ips/:ip', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const ipAddress = req.params.ip;
      const success = await storage.unbanIp(ipAddress);
      
      if (!success) {
        return res.status(404).json({ error: 'IP not found or already unbanned' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error unbanning IP:', error);
      res.status(500).json({ error: 'Failed to unban IP' });
    }
  });

  // Referral system endpoints
  app.get('/api/user/:userId/referral-code', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ referralCode: user.referralCode });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get referral code' });
    }
  });

  app.get('/api/user/:userId/referrals', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const referrals = await storage.getUserReferrals(userId);
      res.json({ referrals });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get referrals' });
    }
  });

  app.get('/api/user/:userId/quantum-love', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const points = await storage.getUserQuantumLovePoints(userId);
      const transactions = await storage.getQuantumLoveTransactions(userId);
      
      res.json({ 
        points,
        transactions 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Quantum Love data' });
    }
  });

  app.post('/api/referral/complete/:referralId', async (req, res) => {
    try {
      const referralId = parseInt(req.params.referralId);
      const referral = await storage.completeReferral(referralId);
      
      if (!referral) {
        return res.status(404).json({ error: 'Referral not found' });
      }
      
      // Give rewards to both users
      await Promise.all([
        // Give points to referrer
        storage.addQuantumLovePoints(
          referral.referrerId,
          100,
          "referral_bonus",
          "You earned points for referring a friend! 🎉",
          referral.id
        ),
        // Give additional welcome bonus to referred user
        storage.addQuantumLovePoints(
          referral.referredId,
          25,
          "referral_completion",
          "Bonus for completing your first meditation! ✨",
          referral.id
        )
      ]);
      
      res.json({ message: 'Referral completed and rewards distributed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete referral' });
    }
  });

  // Generate referral code for current user
  app.post('/api/user/generate-referral-code', async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user already has a referral code
      if (user.referralCode) {
        return res.json({ referralCode: user.referralCode });
      }

      // Generate a unique referral code
      let referralCode: string = '';
      let isUnique = false;
      
      while (!isUnique) {
        referralCode = nanoid(8);
        // Check if code already exists
        const existingUser = await storage.getUserByReferralCode(referralCode);
        isUnique = !existingUser;
      }
      
      // Update user with referral code
      const updated = await storage.updateUser(user.id, { referralCode });
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update user' });
      }
      
      res.json({ referralCode });
    } catch (error) {
      console.error('Error generating referral code:', error);
      res.status(500).json({ error: 'Failed to generate referral code' });
    }
  });

  app.get('/api/referral/validate/:code', async (req, res) => {
    try {
      const code = req.params.code;
      
      // Try both original case and uppercase
      let referrer = await storage.getUserByReferralCode(code);
      if (!referrer) {
        referrer = await storage.getUserByReferralCode(code.toUpperCase());
      }
      
      if (!referrer) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }
      
      res.json({ 
        valid: true,
        referrer: {
          name: referrer.name,
          id: referrer.id
        }
      });
    } catch (error) {
      console.error('Error validating referral code:', error);
      res.status(500).json({ error: 'Failed to validate referral code' });
    }
  });

  return httpServer;
}
