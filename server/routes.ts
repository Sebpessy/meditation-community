import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMeditationTemplateSchema, insertScheduleSchema, insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";

// WebSocket connection management
const activeConnections = new Map<WebSocket, { userId?: number, sessionDate?: string }>();

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
            
            // Broadcast user joined
            broadcastToSession(message.sessionDate, {
              type: 'user-joined',
              userId: message.userId,
              onlineCount: getOnlineCount(message.sessionDate)
            });
            break;

          case 'chat-message':
            if (connectionInfo.userId && connectionInfo.sessionDate) {
              const chatMessage = await storage.createChatMessage({
                userId: connectionInfo.userId,
                message: message.text,
                sessionDate: connectionInfo.sessionDate
              });

              // Get user info for the message
              const user = await storage.getUser(connectionInfo.userId);
              
              // Broadcast message to all users in the session
              broadcastToSession(connectionInfo.sessionDate, {
                type: 'new-message',
                message: {
                  ...chatMessage,
                  user: user ? { id: user.id, name: user.name } : { id: 0, name: 'Unknown' }
                }
              });
            }
            break;

          case 'leave-session':
            if (connectionInfo.sessionDate) {
              broadcastToSession(connectionInfo.sessionDate, {
                type: 'user-left',
                userId: connectionInfo.userId,
                onlineCount: getOnlineCount(connectionInfo.sessionDate) - 1
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      const connectionInfo = activeConnections.get(ws);
      if (connectionInfo?.sessionDate) {
        broadcastToSession(connectionInfo.sessionDate, {
          type: 'user-left',
          userId: connectionInfo.userId,
          onlineCount: getOnlineCount(connectionInfo.sessionDate) - 1
        });
      }
      activeConnections.delete(ws);
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
    let count = 0;
    activeConnections.forEach((connectionInfo) => {
      if (connectionInfo.sessionDate === sessionDate) {
        count++;
      }
    });
    return count;
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

  // Meditation routes
  app.get('/api/meditation/today', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
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
      
      // Get user info for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (msg) => {
          const user = msg.userId ? await storage.getUser(msg.userId) : null;
          return {
            ...msg,
            user: user ? { id: user.id, name: user.name } : { id: 0, name: 'Unknown' }
          };
        })
      );

      res.json(messagesWithUsers);
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
