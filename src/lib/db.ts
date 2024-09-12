
import { count, eq, ilike } from 'drizzle-orm';
import * as s from './schema';

import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { AccumulatedSessionData, RawSessionData, RawSessionOverview, UserSessionData } from './types';
import { accumulateSessionData } from '@/lib/utils';

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql, {schema: s});

export async function insertSession(data: s.InsertSession):Promise<{ id: number }[]> {
  return db.insert(s.sessions).values(data).returning({id:s.sessions.id});
}

export async function getSessions(
  search: string,
  offset: number
): Promise<{
  sessions: s.SelectSession[];
  newOffset: number | null;
  totalSessions: number;
}> {
  // Always search the full table, not per page
  if (search) {
    return {
      sessions: await db
        .select()
        .from(s.sessions)
        .where(ilike(s.sessions.name, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalSessions: 0
    };
  }

  if (offset === null) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }

  let totalSessions = await db.select({ count: count() }).from(s.sessions);
  if (totalSessions[0].count === 0) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }
  let allSessions = await db.query.sessions.findMany({
    limit: 20,
    offset: offset,
    orderBy: (sessions, { desc }) => [desc(sessions.id)]
  })

  // select().from(sessions).limit(5).offset(offset);
  // let newOffset = moreSessions.length >= 5 ? offset + 5 : null;
  let newOffset = null;

  return {
    sessions: allSessions,
    newOffset,
    totalSessions: totalSessions[0].count
  };
}

export async function deleteSessionById(id: number) {
  await db.delete(s.sessions).where(eq(s.sessions.id, id));
}


export async function getSessionsFromMake() {
  console.log('Fetching sessions from Make...');
  const response = await fetch('/api/sessions');
  if (!response.ok) {
    console.error(
      'Network response was not ok: ',
      response.status,
      response.text
    );
    return null;
  }
  const data = await response.json();
  console.log('Data fetched from API:', data);
  return parseDbItems(data.userData, data.sessionData);
}

type DbResponse = {
  records: {
    key: string;
    data: UserSessionData | RawSessionOverview;
  }[];
};
function parseDbItems(userData: DbResponse, sessionData: DbResponse) {
  let accumulatedSessions: Record<string, AccumulatedSessionData> = {};
  sessionData.records.forEach((record) => {
    let entry: RawSessionData = {
      session_data: record.data as RawSessionOverview,
      user_data: userData.records.reduce((acc, userRecord) => {
        const uData = userRecord.data as UserSessionData;
        if (uData.session_id === record.key) {
          console.log(`UserData found for session ${record.key}:`, uData);
          acc[userRecord.key] = uData;
        }
        return acc;
      }, {} as Record<string, UserSessionData>),
    };
    console.log(`Accumulating session data for ${record.key}:`, entry);
    const accumulated = accumulateSessionData(entry);
    accumulatedSessions[record.key] = accumulated;
  });
  return accumulatedSessions;
}