import { pgTable, serial, text, timestamp, integer, boolean, foreignKey, pgEnum } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

export const hostData = pgTable("host_data", {
	id: serial("id").primaryKey().notNull(),
	numSessions: integer("num_sessions").notNull(),
	active: integer("active").notNull(),
	finished: integer("finished").notNull(),
	summary: text("summary").notNull(),
	template: text("template").notNull(),
	topic: text("topic").notNull(),
	context: text("context").notNull(),
	finalReportSent: boolean("final_report_sent").notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
});

export const userData = pgTable("user_data", {
	id: serial("id").primaryKey().notNull(),
  sessionId: integer('session_id').references(() => hostData.id),
	userId: text("user_id"),
	active: boolean("active"),
	template: text("template"),
	feedback: text("feedback"),
	chatText: text("chat_text"),
	threadId: text("thread_id"),
	resultText: text("result_text"),
	botId: text("bot_id"),
	hostChatId: text("host_chat_id"),
});

export const hostRelations = relations(hostData, ({ many }) => ({
  userData: many(userData)
}));

export const userDataRelations = relations(userData, ({ one }) => ({
  session: one(hostData, {
    fields: [userData.sessionId],
    references: [hostData.id],
  }),
}));

export type InsertHostData = typeof hostData.$inferInsert;
export type SelectHostData = typeof hostData.$inferSelect;

export type InsertUserData = typeof userData.$inferInsert;
export type SelectUserData = typeof userData.$inferSelect;
