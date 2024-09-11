
import { count, eq, ilike } from 'drizzle-orm';
import { sessions, InsertSession, SelectSession } from '../db/schema';

import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql);

export async function insertSession(data: InsertSession):Promise<{ id: number }[]> {
  return db.insert(sessions).values(data).returning({id:sessions.id});
}

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
  if (totalSessions[0].count === 0) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }
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
