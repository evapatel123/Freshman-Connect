import { pgTable, serial, timestamp, integer, jsonb, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  freshmanId: integer("freshman_id").notNull(),
  leaderId: integer("leader_id").notNull(),
  matchScore: real("match_score").notNull().default(0),
  sharedInterests: jsonb("shared_interests").notNull().$type<string[]>().default([]),
  status: text("status").notNull().default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
