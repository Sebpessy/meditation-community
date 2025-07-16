import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMeditationTemplateSchema, insertScheduleSchema, insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";

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
            
            // Check if it's a new day and flush chat if needed
            const today = new Date().toISOString().split('T')[0];
            if (message.sessionDate === today) {
              // Check if there are messages from previous days that need to be flushed
              const currentMessages = await storage.getChatMessages(message.sessionDate, 1);
              if (currentMessages.length > 0) {
                const firstMessageDate = new Date(currentMessages[0].timestamp).toISOString().split('T')[0];
                if (firstMessageDate !== today) {
                  // Flush old messages for fresh start
                  await storage.flushChatMessages(message.sessionDate);
                  console.log(`Flushed old chat messages for session: ${message.sessionDate}`);
                }
              }
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
                    profilePicture: msg.user.profilePicture
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

      const user = await storage.createUser(userData);
      console.log('User created successfully:', user);
      res.json(user);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  app.get('/api/auth/user/:firebaseUid', async (req, res) => {
    try {
      console.log('Fetching user with Firebase UID:', req.params.firebaseUid);
      const user = await storage.getUserByFirebaseUid(req.params.firebaseUid);
      if (!user) {
        console.log('User not found for Firebase UID:', req.params.firebaseUid);
        return res.status(404).json({ error: 'User not found' });
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

  app.get('/api/admin/schedules', async (req, res) => {
    try {
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
      res.json(users);
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

  return httpServer;
}
