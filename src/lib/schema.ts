import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  foreignKey,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// All except the numSessions & prompt are also in make.com db
export const host_data = pgTable('host_data', {
  id: text('id').primaryKey().notNull(),  // Todo: HRM-264 Change 'text' to 'serial' or UUID or so once we swap over to using this as our main db so that it creates the id on insert
  prompt: text('prompt').notNull(),
  numSessions: integer('num_sessions').notNull(),
  active: boolean('active').notNull(),
  finished: integer('finished'),
  summary: text('summary'),
  template: text('template').notNull(),
  topic: text('topic').notNull(),
  context: text('context'),
  client: text('client'),
  finalReportSent: boolean('final_report_sent'),
  startTime: timestamp('start_time', { mode: 'string' }).notNull(),
});

// Mapped basically 1-1 from make.com db
export const user_data = pgTable('user_data', {
  id: text('id').primaryKey().notNull(),  // Todo: HRM-264 Change 'text' to 'serial' or UUID or so once we swap over to using this as our main db so that it creates the id on insert
  sessionId: text('session_id').references(() => host_data.id),
  userId: text('user_id'),
  active: integer('active'),
  template: text('template'),
  feedback: text('feedback'),
  chatText: text('chat_text'),
  threadId: text('thread_id'),
  resultText: text('result_text'),
  botId: text('bot_id'),
  hostChatId: text('host_chat_id'),
});

export const hostRelations = relations(host_data, ({ many }) => ({
  userData: many(user_data),
}));

export const userDataRelations = relations(user_data, ({ one }) => ({
  session: one(host_data, {
    fields: [user_data.sessionId],
    references: [host_data.id],
  }),
}));

export type InsertHostData = typeof host_data.$inferInsert;
export type SelectHostData = typeof host_data.$inferSelect;

export type InsertUserData = typeof user_data.$inferInsert;
export type SelectUserData = typeof user_data.$inferSelect;
