import { users, meditationTemplates, schedules, chatMessages, messageLikes, moodEntries, meditationSessions, profilePictures, bannedIps, type User, type InsertUser, type MeditationTemplate, type InsertMeditationTemplate, type Schedule, type InsertSchedule, type ChatMessage, type ChatMessageWithUser, type InsertChatMessage, type MessageLike, type InsertMessageLike, type MoodEntry, type InsertMoodEntry, type MeditationSession, type InsertMeditationSession, type ProfilePicture, type InsertProfilePicture, type BannedIp, type InsertBannedIp } from "@shared/schema";
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
  banUser(id: number, reason: string, bannedBy: number): Promise<User | undefined>;
  unbanUser(id: number): Promise<User | undefined>;
  makeGardenAngel(id: number): Promise<User | undefined>;
  removeGardenAngel(id: number): Promise<User | undefined>;
  updateUserLastLoginIp(id: number, ip: string): Promise<void>;
  
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
  deleteChatMessage(messageId: number): Promise<boolean>;
  flushChatMessages(sessionDate: string): Promise<boolean>;
  flushOldChatMessages(currentDate: string): Promise<boolean>;
  
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
  getSessionDurations(userId: number): Promise<Array<{ sessionDate: string, duration: number }>>;
  getOrCreateTodaySession(userId: number, sessionDate: string): Promise<MeditationSession>;
  
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

  // IP ban operations
  banIp(ipAddress: string, bannedBy: number, reason?: string): Promise<BannedIp>;
  unbanIp(ipAddress: string): Promise<boolean>;
  isIpBanned(ipAddress: string): Promise<boolean>;
  getBannedIps(): Promise<BannedIp[]>;
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

      // Delete all related data to avoid foreign key constraints
      // Delete chat messages by this user
      await db.delete(chatMessages).where(eq(chatMessages.userId, id));
      
      // Delete message likes by this user
      await db.delete(messageLikes).where(eq(messageLikes.userId, id));
      
      // Delete mood entries by this user
      await db.delete(moodEntries).where(eq(moodEntries.userId, id));
      
      // Delete meditation sessions by this user
      await db.delete(meditationSessions).where(eq(meditationSessions.userId, id));
      
      // Delete the user from PostgreSQL
      const result = await db.delete(users).where(eq(users.id, id));
      const dbDeleted = (result.rowCount || 0) > 0;

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

  async banUser(id: number, reason: string, bannedBy: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ 
        isBanned: true, 
        bannedAt: new Date(),
        bannedReason: reason 
      })
      .where(eq(users.id, id))
      .returning();
    
    // Also ban their IP if they have one
    if (updated?.lastLoginIp) {
      await this.banIp(updated.lastLoginIp, bannedBy, `Auto-banned with user: ${reason}`);
    }
    
    return updated || undefined;
  }

  async unbanUser(id: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ 
        isBanned: false, 
        bannedAt: null,
        bannedReason: null 
      })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async makeGardenAngel(id: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isGardenAngel: true })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async removeGardenAngel(id: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ isGardenAngel: false })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async updateUserLastLoginIp(id: number, ip: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginIp: ip })
      .where(eq(users.id, id));
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
    const results = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        templateId: schedules.templateId,
        scheduledTime: schedules.scheduledTime,
        isActive: schedules.isActive,
        repeatWeeks: schedules.repeatWeeks,
        repeatCount: schedules.repeatCount,
        createdAt: schedules.createdAt,
        template: meditationTemplates,
      })
      .from(schedules)
      .leftJoin(meditationTemplates, eq(schedules.templateId, meditationTemplates.id));
    
    return results.map(result => ({
      ...result,
      template: result.template || undefined,
    }));
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

  async getChatMessages(sessionDate: string, limit: number = 1000): Promise<ChatMessageWithUser[]> {
    console.log('getChatMessages called for session:', sessionDate);
    
    const messages = await db.select({
      id: chatMessages.id,
      message: chatMessages.message,
      timestamp: chatMessages.timestamp,
      userId: chatMessages.userId,
      userName: users.name,
      userProfilePicture: users.profilePicture,
      isGardenAngel: users.isGardenAngel
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
        profilePicture: msg.userProfilePicture,
        isGardenAngel: msg.isGardenAngel || false
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
        profilePicture: user?.profilePicture || null,
        isGardenAngel: user?.isGardenAngel || false
      }
    };
  }

  async getChatMessageById(messageId: number): Promise<{ sessionDate: string } | null> {
    try {
      const [message] = await db.select({
        sessionDate: chatMessages.sessionDate
      })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);
      
      return message || null;
    } catch (error) {
      console.error('Error getting chat message:', error);
      return null;
    }
  }

  async deleteChatMessage(messageId: number): Promise<boolean> {
    try {
      // First delete any likes for this message
      await db.delete(messageLikes).where(eq(messageLikes.messageId, messageId));
      
      // Then delete the message
      const result = await db.delete(chatMessages).where(eq(chatMessages.id, messageId));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting chat message:', error);
      return false;
    }
  }

  async flushChatMessages(sessionDate: string): Promise<boolean> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.sessionDate, sessionDate));
    return (result.rowCount || 0) > 0;
  }

  async flushOldChatMessages(currentDate: string): Promise<boolean> {
    try {
      // First delete message likes for old messages
      await db.delete(messageLikes).where(
        sql`message_id IN (SELECT id FROM chat_messages WHERE session_date != ${currentDate})`
      );
      
      // Then delete old chat messages (not from current date)
      const result = await db.delete(chatMessages).where(
        sql`session_date != ${currentDate}`
      );
      
      console.log(`Flushed ${result.rowCount || 0} old chat messages from before ${currentDate}`);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error flushing old chat messages:', error);
      return false;
    }
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

  async getOrCreateTodaySession(userId: number, sessionDate: string): Promise<MeditationSession> {
    // Check if there's already an active session for today
    const existingSessions = await this.getMeditationSessions(userId, sessionDate);
    
    if (existingSessions.length > 0) {
      // Return the most recent session
      const session = existingSessions[0];
      console.log(`Found existing session ${session.id} for user ${userId} on ${sessionDate}`);
      return session;
    }
    
    // Create a new session if none exists
    console.log(`Creating new session for user ${userId} on ${sessionDate}`);
    return await this.createMeditationSession({
      userId,
      sessionDate,
      startTime: new Date()
    });
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

  // Get session durations by date for a user
  async getSessionDurations(userId: number): Promise<Array<{ sessionDate: string, duration: number }>> {
    const sessions = await db.select({
      sessionDate: meditationSessions.sessionDate,
      totalDuration: sql<number>`COALESCE(SUM(${meditationSessions.duration}), 0)`
    })
    .from(meditationSessions)
    .where(and(
      eq(meditationSessions.userId, userId),
      isNotNull(meditationSessions.duration)
    ))
    .groupBy(meditationSessions.sessionDate)
    .orderBy(desc(meditationSessions.sessionDate));

    return sessions.map(session => ({
      sessionDate: session.sessionDate,
      duration: Number(session.totalDuration) || 0
    }));
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
    return (result.rowCount || 0) > 0;
  }

  async banIp(ipAddress: string, bannedBy: number, reason?: string): Promise<BannedIp> {
    const [bannedIp] = await db
      .insert(bannedIps)
      .values({
        ipAddress,
        bannedBy,
        reason: reason || 'Banned by admin'
      })
      .returning();
    return bannedIp;
  }

  async unbanIp(ipAddress: string): Promise<boolean> {
    const result = await db
      .update(bannedIps)
      .set({ isActive: false })
      .where(eq(bannedIps.ipAddress, ipAddress));
    return (result.rowCount || 0) > 0;
  }

  async isIpBanned(ipAddress: string): Promise<boolean> {
    const [banned] = await db
      .select()
      .from(bannedIps)
      .where(and(
        eq(bannedIps.ipAddress, ipAddress),
        eq(bannedIps.isActive, true)
      ));
    return !!banned;
  }

  async getBannedIps(): Promise<BannedIp[]> {
    return await db
      .select()
      .from(bannedIps)
      .where(eq(bannedIps.isActive, true));
  }
}

export const storage = new DatabaseStorage();
