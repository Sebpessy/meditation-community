import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMeditationTemplateSchema, insertScheduleSchema, insertChatMessageSchema, insertMoodEntrySchema, insertMeditationSessionSchema, insertProfilePictureSchema } from "@shared/schema";
import { z } from "zod";

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
const activeConnections = new Map<WebSocket, { userId?: number, sessionDate?: string }>();
const sessionUsers = new Map<string, Set<number>>(); // sessionDate -> Set of userIds

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
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
            activeConnections.set(ws, connectionInfo);
            
            // Track unique users in session
            if (!sessionUsers.has(message.sessionDate)) {
              sessionUsers.set(message.sessionDate, new Set());
            }
            sessionUsers.get(message.sessionDate)!.add(message.userId);
            
            // Check if it's a new day and flush old chat messages if needed
            // Use CST time for consistency
            const now = new Date();
            const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
            const today = cstTime.toISOString().split('T')[0];
            if (message.sessionDate === today) {
              // Flush messages from previous days (not today's session)
              await storage.flushOldChatMessages(today);
              console.log(`Checked and flushed old chat messages before ${today}`);
            }
            
            // Send initial messages to the user (last 30 messages)
            try {
              const initialMessages = await storage.getChatMessages(message.sessionDate, 30);
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
                sessionUsers.get(connectionInfo.sessionDate)?.delete(connectionInfo.userId);
              }
              
              const onlineUsers = await getOnlineUsers(connectionInfo.sessionDate);
              
              broadcastToSession(connectionInfo.sessionDate, {
                type: 'user-left',
                userId: connectionInfo.userId,
                onlineCount: getOnlineCount(connectionInfo.sessionDate) - 1,
                onlineUsers: onlineUsers
              });
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
          sessionUsers.get(connectionInfo.sessionDate)?.delete(connectionInfo.userId);
        }
        
        const onlineUsers = await getOnlineUsers(connectionInfo.sessionDate);
        
        broadcastToSession(connectionInfo.sessionDate, {
          type: 'user-left',
          userId: connectionInfo.userId,
          onlineCount: getOnlineCount(connectionInfo.sessionDate),
          onlineUsers: onlineUsers
        });
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
    return userSet ? userSet.size : 0;
  }

  async function getOnlineUsers(sessionDate: string): Promise<Array<{id: number, name: string, profilePicture?: string}>> {
    const userSet = sessionUsers.get(sessionDate);
    if (!userSet || userSet.size === 0) return [];
    
    const userIds = Array.from(userSet);
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const user = await storage.getUser(userId);
        return user ? {
          id: user.id,
          name: user.name,
          profilePicture: user.profilePicture
        } : null;
      })
    );
    
    return users.filter(user => user !== null) as Array<{id: number, name: string, profilePicture?: string}>;
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
      
      const userWithAvatar = {
        ...userData,
        profilePicture: randomProfilePicture
      };

      const user = await storage.createUser(userWithAvatar);
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
      const cstTime = new Date(now.getTime() + (cstOffset * 60 * 60 * 1000));
      const today = cstTime.toISOString().split('T')[0];
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
        } catch (error) {
          errors.push({
            template: template.title || 'Unknown',
            error: error.message
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
      
      for (const [ws, connectionInfo] of activeConnections) {
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

  return httpServer;
}
