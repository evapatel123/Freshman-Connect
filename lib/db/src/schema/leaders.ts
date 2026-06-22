import { pgTable, text, serial, timestamp, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderProfilesTable = pgTable("leader_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  bio: text("bio").notNull(),
  interests: jsonb("interests").notNull().$type<string[]>().default([]),
  activities: jsonb("activities").notNull().$type<string[]>().default([]),
  favoriteClasses: jsonb("favorite_classes").notNull().$type<string[]>().default([]),
  apHonorsExperience: text("ap_honors_experience"),
  satActExperience: text("sat_act_experience"),
  collegePlans: text("college_plans"),
  availability: text("availability").notNull().default("weekdays"),
  matchCount: integer("match_count").notNull().default(0),
  rating: real("rating"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaderProfileSchema = createInsertSchema(leaderProfilesTable).omit({ id: true, createdAt: true, updatedAt: true, matchCount: true, rating: true });
export type InsertLeaderProfile = z.infer<typeof insertLeaderProfileSchema>;
export type LeaderProfile = typeof leaderProfilesTable.$inferSelect;
