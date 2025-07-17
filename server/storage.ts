import { users, meditationTemplates, schedules, chatMessages, messageLikes, moodEntries, meditationSessions, profilePictures, type User, type InsertUser, type MeditationTemplate, type InsertMeditationTemplate, type Schedule, type InsertSchedule, type ChatMessage, type ChatMessageWithUser, type InsertChatMessage, type MessageLike, type InsertMessageLike, type MoodEntry, type InsertMoodEntry, type MeditationSession, type InsertMeditationSession, type ProfilePicture, type InsertProfilePicture } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Template operations
  getAllTemplates(): Promise<MeditationTemplate[]>;
  getTemplate(id: number): Promise<MeditationTemplate | undefined>;
  createTemplate(template: InsertMeditationTemplate): Promise<MeditationTemplate>;
  updateTemplate(id: number, template: Partial<InsertMeditationTemplate>): Promise<MeditationTemplate | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  
  // Schedule operations
  getScheduleByDate(date: string): Promise<Schedule | undefined>;
  getAllSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;
  
  // Chat operations
  getChatMessages(sessionDate: string, limit?: number): Promise<ChatMessageWithUser[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessageWithUser>;
  flushChatMessages(sessionDate: string): Promise<boolean>;
  
  // Like operations
  likeMessage(messageId: number, userId: number): Promise<boolean>;
  unlikeMessage(messageId: number, userId: number): Promise<boolean>;
  getMessageLikes(messageId: number): Promise<number>;
  getUserLikedMessages(userId: number): Promise<number[]>;
  
  // Mood tracking operations
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;
  getMoodEntries(userId: number, sessionDate?: string): Promise<MoodEntry[]>;
  getLatestMoodEntry(userId: number, sessionDate: string, moodType: string): Promise<MoodEntry | undefined>;

  // Meditation session operations
  createMeditationSession(session: InsertMeditationSession): Promise<MeditationSession>;
  getMeditationSessions(userId: number, sessionDate?: string): Promise<MeditationSession[]>;
  updateMeditationSession(id: number, session: Partial<MeditationSession>): Promise<MeditationSession | undefined>;
  getSessionDuration(userId: number, sessionDate: string): Promise<number>;
  
  // User analytics
  getUserLastLogin(userId: number): Promise<Date | null>;
  getUserTotalTimeSpent(userId: number): Promise<number>;
  
  // Profile picture operations
  getAllProfilePictures(): Promise<ProfilePicture[]>;
  getActiveProfilePictures(): Promise<ProfilePicture[]>;
  getProfilePicture(id: number): Promise<ProfilePicture | undefined>;
  createProfilePicture(picture: InsertProfilePicture): Promise<ProfilePicture>;
  updateProfilePicture(id: number, picture: Partial<InsertProfilePicture>): Promise<ProfilePicture | undefined>;
  deleteProfilePicture(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with sample data if tables are empty
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    try {
      // Check if templates already exist
      const existingTemplates = await db.select().from(meditationTemplates).limit(1);
      if (existingTemplates.length > 0) {
        return; // Sample data already exists
      }

      // Create sample templates
      const sampleTemplates = [
        {
          title: "Morning Mindfulness",
          description: "Begin your day with gentle awareness and peaceful presence",
          duration: 12,
          difficulty: "Beginner",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1545389336-cf090694435e",
          instructor: "Sarah Johnson",
          instructorTitle: "Mindfulness Teacher",
          sessionSteps: [
            { number: 1, title: "Find your comfortable position", description: "Sit comfortably with your back straight and eyes closed" },
            { number: 2, title: "Focus on your breath", description: "Notice the natural rhythm of your breathing" },
            { number: 3, title: "Observe without judgment", description: "Let thoughts come and go naturally" }
          ],
        },
        {
          title: "Nature Connection",
          description: "Connect with the natural world within",
          duration: 18,
          difficulty: "Intermediate",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a",
          instructor: "Michael Chen",
          instructorTitle: "Nature Guide",
          sessionSteps: [
            { number: 1, title: "Ground yourself", description: "Feel your connection to the earth" },
            { number: 2, title: "Visualize nature", description: "Imagine yourself in a peaceful natural setting" },
            { number: 3, title: "Breathe with nature", description: "Sync your breath with the natural world" }
          ],
        },
        {
          title: "Evening Reflection",
          description: "Wind down and reflect on your day",
          duration: 15,
          difficulty: "Beginner",
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
          instructor: "Lisa Parker",
          instructorTitle: "Reflection Coach",
          sessionSteps: [
            { number: 1, title: "Review your day", description: "Think about the positive moments" },
            { number: 2, title: "Release tensions", description: "Let go of any stress or worries" },
            { number: 3, title: "Set intentions", description: "Focus on tomorrow's possibilities" }
          ],
        }
      ];

      // Insert sample templates one by one
      const insertedTemplates = [];
      for (const template of sampleTemplates) {
        const [inserted] = await db.insert(meditationTemplates).values(template as any).returning();
        insertedTemplates.push(inserted);
      }
      
      // Create today's schedule with the first template
      const today = new Date().toISOString().split('T')[0];
      await db.insert(schedules).values({
        date: today,
        templateId: insertedTemplates[0].id,
        scheduledTime: "09:00",
        isActive: true,
      });
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // First get the user to retrieve their Firebase UID
      const user = await this.getUser(id);
      if (!user) {
        return false;
      }

      // Delete all chat messages by this user to avoid foreign key constraint
      await db.delete(chatMessages).where(eq(chatMessages.userId, id));
      
      // Delete the user from PostgreSQL
      const result = await db.delete(users).where(eq(users.id, id));
      const dbDeleted = result.rowCount ? result.rowCount > 0 : false;

      // Delete user from Firebase Auth
      const { deleteFirebaseUser } = await import('./firebase-admin');
      const firebaseDeleted = await deleteFirebaseUser(user.firebaseUid);

      if (!firebaseDeleted) {
        console.warn(`Failed to delete user ${id} from Firebase Auth, but deleted from database`);
      }

      return dbDeleted;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAllTemplates(): Promise<MeditationTemplate[]> {
    return await db.select().from(meditationTemplates);
  }

  async getTemplate(id: number): Promise<MeditationTemplate | undefined> {
    const [template] = await db.select().from(meditationTemplates).where(eq(meditationTemplates.id, id));
    return template || undefined;
  }

  async createTemplate(template: InsertMeditationTemplate): Promise<MeditationTemplate> {
    const [newTemplate] = await db
      .insert(meditationTemplates)
      .values(template as any)
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: number, template: Partial<InsertMeditationTemplate>): Promise<MeditationTemplate | undefined> {
    const [updated] = await db
      .update(meditationTemplates)
      .set(template as any) // Cast to any to avoid strict type checking issues
      .where(eq(meditationTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(meditationTemplates).where(eq(meditationTemplates.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getScheduleByDate(date: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.date, date));
    return schedule || undefined;
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules);
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db
      .insert(schedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [updated] = await db
      .update(schedules)
      .set(schedule)
      .where(eq(schedules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    const result = await db.delete(schedules).where(eq(schedules.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getChatMessages(sessionDate: string, limit: number = 50): Promise<ChatMessageWithUser[]> {
    console.log('getChatMessages called for session:', sessionDate);
    
    const messages = await db.select({
      id: chatMessages.id,
      message: chatMessages.message,
      timestamp: chatMessages.timestamp,
      userId: chatMessages.userId,
      userName: users.name,
      userProfilePicture: users.profilePicture
    })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.sessionDate, sessionDate))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
    
    console.log('Raw messages from DB:', messages.length);
    console.log('Sample message:', messages[0]);
    
    // Transform to match the expected ChatMessage format
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      message: msg.message,
      timestamp: msg.timestamp,
      user: {
        id: msg.userId,
        name: msg.userName,
        profilePicture: msg.userProfilePicture
      }
    }));
    
    console.log('Transformed messages:', transformedMessages.length);
    console.log('Sample transformed:', transformedMessages[0]);
    
    return transformedMessages.reverse(); // Return in chronological order
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessageWithUser> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    
    // Get the user information including profile picture
    const user = await this.getUser(newMessage.userId || 0);
    
    return {
      id: newMessage.id,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
      user: {
        id: user?.id || null,
        name: user?.name || 'Unknown',
        profilePicture: user?.profilePicture || null
      }
    };
  }

  async flushChatMessages(sessionDate: string): Promise<boolean> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.sessionDate, sessionDate));
    return (result.rowCount || 0) > 0;
  }

  async likeMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      await db.insert(messageLikes).values({
        messageId,
        userId
      });
      return true;
    } catch (error) {
      console.error('Error liking message:', error);
      return false;
    }
  }

  async unlikeMessage(messageId: number, userId: number): Promise<boolean> {
    const result = await db.delete(messageLikes).where(
      and(
        eq(messageLikes.messageId, messageId),
        eq(messageLikes.userId, userId)
      )
    );
    return (result.rowCount || 0) > 0;
  }

  async getMessageLikes(messageId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(messageLikes)
      .where(eq(messageLikes.messageId, messageId));
    return result[0]?.count || 0;
  }

  async getUserLikedMessages(userId: number): Promise<number[]> {
    const likes = await db
      .select({ messageId: messageLikes.messageId })
      .from(messageLikes)
      .where(eq(messageLikes.userId, userId));
    return likes.map(like => like.messageId).filter(id => id !== null);
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const [newEntry] = await db
      .insert(moodEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getMoodEntries(userId: number, sessionDate?: string): Promise<MoodEntry[]> {
    const conditions = [eq(moodEntries.userId, userId)];
    if (sessionDate) {
      conditions.push(eq(moodEntries.sessionDate, sessionDate));
    }
    
    return await db
      .select()
      .from(moodEntries)
      .where(and(...conditions))
      .orderBy(desc(moodEntries.createdAt));
  }

  async getLatestMoodEntry(userId: number, sessionDate: string, moodType: string): Promise<MoodEntry | undefined> {
    const [entry] = await db
      .select()
      .from(moodEntries)
      .where(and(
        eq(moodEntries.userId, userId),
        eq(moodEntries.sessionDate, sessionDate),
        eq(moodEntries.moodType, moodType)
      ))
      .orderBy(desc(moodEntries.createdAt))
      .limit(1);
    return entry;
  }

  async createMeditationSession(session: InsertMeditationSession): Promise<MeditationSession> {
    const [newSession] = await db
      .insert(meditationSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getMeditationSessions(userId: number, sessionDate?: string): Promise<MeditationSession[]> {
    const conditions = [eq(meditationSessions.userId, userId)];
    if (sessionDate) {
      conditions.push(eq(meditationSessions.sessionDate, sessionDate));
    }
    
    return await db
      .select()
      .from(meditationSessions)
      .where(and(...conditions))
      .orderBy(desc(meditationSessions.createdAt));
  }

  async updateMeditationSession(id: number, session: Partial<MeditationSession>): Promise<MeditationSession | undefined> {
    const [updatedSession] = await db
      .update(meditationSessions)
      .set(session)
      .where(eq(meditationSessions.id, id))
      .returning();
    
    return updatedSession;
  }

  async getSessionDuration(userId: number, sessionDate: string): Promise<number> {
    const sessions = await this.getMeditationSessions(userId, sessionDate);
    return sessions.reduce((total, session) => total + (session.duration || 0), 0);
  }

  // Get user's last login date and time
  async getUserLastLogin(userId: number): Promise<Date | null> {
    const lastSession = await db.select({
      startTime: meditationSessions.startTime
    })
    .from(meditationSessions)
    .where(eq(meditationSessions.userId, userId))
    .orderBy(desc(meditationSessions.startTime))
    .limit(1);

    return lastSession.length > 0 ? lastSession[0].startTime : null;
  }

  // Get user's total time spent in meditation (in minutes)
  async getUserTotalTimeSpent(userId: number): Promise<number> {
    const totalDuration = await db.select({
      totalDuration: sql<number>`COALESCE(SUM(${meditationSessions.duration}), 0)`
    })
    .from(meditationSessions)
    .where(and(
      eq(meditationSessions.userId, userId),
      isNotNull(meditationSessions.duration)
    ));

    // Convert seconds to minutes
    return Math.round((totalDuration[0]?.totalDuration || 0) / 60);
  }

  // Profile picture operations
  async getAllProfilePictures(): Promise<ProfilePicture[]> {
    return await db
      .select()
      .from(profilePictures)
      .orderBy(desc(profilePictures.createdAt));
  }

  async getActiveProfilePictures(): Promise<ProfilePicture[]> {
    return await db
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.isActive, true))
      .orderBy(desc(profilePictures.createdAt));
  }

  async getProfilePicture(id: number): Promise<ProfilePicture | undefined> {
    const [picture] = await db
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.id, id));
    return picture;
  }

  async createProfilePicture(picture: InsertProfilePicture): Promise<ProfilePicture> {
    const [newPicture] = await db
      .insert(profilePictures)
      .values(picture)
      .returning();
    return newPicture;
  }

  async updateProfilePicture(id: number, picture: Partial<InsertProfilePicture>): Promise<ProfilePicture | undefined> {
    const [updatedPicture] = await db
      .update(profilePictures)
      .set({
        ...picture,
        updatedAt: new Date()
      })
      .where(eq(profilePictures.id, id))
      .returning();
    return updatedPicture;
  }

  async deleteProfilePicture(id: number): Promise<boolean> {
    const result = await db
      .delete(profilePictures)
      .where(eq(profilePictures.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
