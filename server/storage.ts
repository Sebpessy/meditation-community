import { users, meditationTemplates, schedules, chatMessages, type User, type InsertUser, type MeditationTemplate, type InsertMeditationTemplate, type Schedule, type InsertSchedule, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  getChatMessages(sessionDate: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
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
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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

  async getChatMessages(sessionDate: string, limit: number = 50): Promise<ChatMessage[]> {
    const messages = await db.select({
      id: chatMessages.id,
      message: chatMessages.message,
      timestamp: chatMessages.timestamp,
      user: {
        id: users.id,
        name: users.name,
        profilePicture: users.profilePicture
      }
    })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.sessionDate, sessionDate))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit);
    
    return messages.reverse(); // Return in chronological order
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    
    // Get the user information including profile picture
    const user = await this.getUser(newMessage.userId);
    
    return {
      id: newMessage.id,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
      user: {
        id: user!.id,
        name: user!.name,
        profilePicture: user!.profilePicture
      }
    };
  }
}

export const storage = new DatabaseStorage();
