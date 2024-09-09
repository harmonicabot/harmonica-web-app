import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial
} from 'drizzle-orm/pg-core';
import { count, eq, ilike } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

export const db = drizzle(neon(process.env.POSTGRES_URL!));

export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  name: text('name').notNull(),
  status: statusEnum('status').notNull(),
  createdAt: timestamp('created_at').notNull()
});

export type SelectSession = typeof sessions.$inferSelect;
export const insertSessionSchema = createInsertSchema(sessions);

export async function getSessions(
  search: string,
  offset: number
): Promise<{
  sessions: SelectSession[];
  newOffset: number | null;
  totalSessions: number;
}> {
  // Always search the full table, not per page
  if (search) {
    return {
      sessions: await db
        .select()
        .from(sessions)
        .where(ilike(sessions.name, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalSessions: 0
    };
  }

  if (offset === null) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }

  let totalSessions = await db.select({ count: count() }).from(sessions);
  let moreSessions = await db.select().from(sessions).limit(5).offset(offset);
  let newOffset = moreSessions.length >= 5 ? offset + 5 : null;

  return {
    sessions: moreSessions,
    newOffset,
    totalSessions: totalSessions[0].count
  };
}

export async function deleteSessionById(id: number) {
  await db.delete(sessions).where(eq(sessions.id, id));
}
