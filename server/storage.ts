import { users, meditationTemplates, schedules, chatMessages, type User, type InsertUser, type MeditationTemplate, type InsertMeditationTemplate, type Schedule, type InsertSchedule, type ChatMessage, type InsertChatMessage } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<number, MeditationTemplate>;
  private schedules: Map<number, Schedule>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentTemplateId: number;
  private currentScheduleId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.schedules = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentTemplateId = 1;
    this.currentScheduleId = 1;
    this.currentMessageId = 1;
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample templates
    const template1: MeditationTemplate = {
      id: 1,
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
      createdAt: new Date(),
    };

    const template2: MeditationTemplate = {
      id: 2,
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
      createdAt: new Date(),
    };

    const template3: MeditationTemplate = {
      id: 3,
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
      createdAt: new Date(),
    };

    this.templates.set(1, template1);
    this.templates.set(2, template2);
    this.templates.set(3, template3);
    this.currentTemplateId = 4;

    // Create today's schedule
    const today = new Date().toISOString().split('T')[0];
    const todaySchedule: Schedule = {
      id: 1,
      date: today,
      templateId: 1,
      scheduledTime: "09:00",
      isActive: true,
      createdAt: new Date(),
    };

    this.schedules.set(1, todaySchedule);
    this.currentScheduleId = 2;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUid,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      isAdmin: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAllTemplates(): Promise<MeditationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: number): Promise<MeditationTemplate | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(template: InsertMeditationTemplate): Promise<MeditationTemplate> {
    const id = this.currentTemplateId++;
    const newTemplate: MeditationTemplate = {
      ...template,
      id,
      thumbnailUrl: template.thumbnailUrl || null,
      sessionSteps: template.sessionSteps as Array<{number: number, title: string, description: string}>,
      createdAt: new Date(),
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: number, template: Partial<InsertMeditationTemplate>): Promise<MeditationTemplate | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    
    const updated: MeditationTemplate = { 
      ...existing, 
      ...template,
      thumbnailUrl: template.thumbnailUrl !== undefined ? template.thumbnailUrl || null : existing.thumbnailUrl,
      sessionSteps: template.sessionSteps ? template.sessionSteps as Array<{number: number, title: string, description: string}> : existing.sessionSteps
    };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    return this.templates.delete(id);
  }

  async getScheduleByDate(date: string): Promise<Schedule | undefined> {
    return Array.from(this.schedules.values()).find(
      (schedule) => schedule.date === date && schedule.isActive
    );
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const id = this.currentScheduleId++;
    const newSchedule: Schedule = {
      ...schedule,
      id,
      templateId: schedule.templateId || null,
      isActive: schedule.isActive !== undefined ? schedule.isActive : true,
      createdAt: new Date(),
    };
    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    
    const updated: Schedule = { 
      ...existing, 
      ...schedule,
      templateId: schedule.templateId !== undefined ? schedule.templateId || null : existing.templateId,
      isActive: schedule.isActive !== undefined ? schedule.isActive : existing.isActive
    };
    this.schedules.set(id, updated);
    return updated;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    return this.schedules.delete(id);
  }

  async getChatMessages(sessionDate: string, limit: number = 50): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values())
      .filter(msg => msg.sessionDate === sessionDate)
      .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime())
      .slice(-limit);
    
    return messages;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentMessageId++;
    const newMessage: ChatMessage = {
      ...message,
      id,
      userId: message.userId || null,
      timestamp: new Date(),
    };
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();
