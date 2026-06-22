import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quizQuestionsTable = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  questionNumber: integer("question_number").notNull(),
  category: text("category").notNull(), // hobbies, academic_interests, extracurriculars, college_goals, career_interests, exploration
  text: text("text").notNull(),
  type: text("type").notNull(), // multiple_choice, scale, boolean
  options: jsonb("options").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizResultsTable = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  hobbies: jsonb("hobbies").notNull().$type<string[]>().default([]),
  academicInterests: jsonb("academic_interests").notNull().$type<string[]>().default([]),
  extracurriculars: jsonb("extracurriculars").notNull().$type<string[]>().default([]),
  collegeGoals: jsonb("college_goals").notNull().$type<string[]>().default([]),
  careerInterests: jsonb("career_interests").notNull().$type<string[]>().default([]),
  isExploring: boolean("is_exploring").notNull().default(false),
  rawAnswers: jsonb("raw_answers").notNull().$type<Record<string, string>>().default({}),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuizResultSchema = createInsertSchema(quizResultsTable).omit({ id: true, completedAt: true });
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResultsTable.$inferSelect;
