import { pgTable, serial, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'draft', 'archived', 'finished']);
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  status: statusEnum('status').notNull(),
  botId: text('botId').notNull(),
  assistantId: text('assistantId').notNull(),
  sessionId: text('sessionId').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull()
});


export type InsertSession = typeof sessions.$inferInsert;
export type SelectSession = typeof sessions.$inferSelect;