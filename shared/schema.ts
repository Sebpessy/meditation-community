import { pgTable, text, serial, integer, boolean, timestamp, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  profilePicture: text("profile_picture"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meditationTemplates = pgTable("meditation_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in minutes
  difficulty: text("difficulty").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  instructor: text("instructor").notNull(),
  instructorTitle: text("instructor_title").notNull(),
  sessionSteps: json("session_steps").$type<Array<{number: number, title: string, description: string}>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  templateId: integer("template_id").references(() => meditationTemplates.id),
  scheduledTime: text("scheduled_time").notNull(), // HH:MM format
  isActive: boolean("is_active").default(true),
  repeatWeeks: integer("repeat_weeks").default(0), // 0 = no repeat, > 0 = repeat every x weeks
  repeatCount: integer("repeat_count").default(1), // 1-4 times to repeat
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  sessionDate: text("session_date").notNull(), // YYYY-MM-DD format
});

export const messageLikes = pgTable("message_likes", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionDate: text("session_date").notNull(), // YYYY-MM-DD format
  emotionLevel: integer("emotion_level").notNull(), // 1-7 representing emotion intensity levels
  moodType: text("mood_type").notNull(), // 'pre' or 'post' meditation
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  firebaseUid: true,
  profilePicture: true,
});

export const updateUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  profilePicture: true,
});

export const insertMeditationTemplateSchema = createInsertSchema(meditationTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const insertMessageLikeSchema = createInsertSchema(messageLikes).omit({
  id: true,
  createdAt: true,
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MeditationTemplate = typeof meditationTemplates.$inferSelect;
export type InsertMeditationTemplate = z.infer<typeof insertMeditationTemplateSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type MessageLike = typeof messageLikes.$inferSelect;
export type InsertMessageLike = z.infer<typeof insertMessageLikeSchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
