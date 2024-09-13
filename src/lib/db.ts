
import { count, eq, ilike, desc } from 'drizzle-orm';
import * as s from './schema';
import { hostData, userData, InsertHostData, SelectHostData, InsertUserData } from './schema';

import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-http";
import { AccumulatedSessionData, RawSessionData, RawSessionOverview, SessionOverview, UserSessionData,  } from './types';
import { accumulateSessionData } from '@/lib/utils';

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql, {schema: s});

export async function insertHostSession(data: InsertHostData):Promise<{ id: number }[]> {
  return db.insert(hostData).values(data).returning({id:hostData.id})[0].id;
}

export async function insertUserSession(data: InsertUserData):Promise<{ id: number }[]> {
  return db.insert(userData).values(data).returning({id:userData.id})[0].id;
}

export async function getHostAndUserSessions(n: number = 100): Promise<Record<string, AccumulatedSessionData>> {
  
  console.log('Getting sessions from database...');

  const sessions = await db.query.hostData.findMany({
    orderBy: desc(hostData.startTime),
    limit: n,
    with: {
      userData: true
    }
  });

  const accumulatedSessions: Record<string, AccumulatedSessionData> = {};
  sessions.forEach(session => {
    accumulatedSessions[session.id.toString()] = {
      session_data: {
        num_sessions: session.numSessions,
        active: session.active,
        finished: session.finished,
        summary: session.summary,
        template: session.template,
        topic: session.topic,
        context: session.context,
        finalReportSent: session.finalReportSent,
        start_time: new Date(session.startTime),
      },
      user_data: session.userData.reduce((acc, user) => {
        acc[user.id.toString()] = user;
        return acc;
      }, {} as Record<string, UserSessionData>)
    };
  });

  console.log('Accumulated sessions from Vercel:', accumulatedSessions);

  return accumulatedSessions;
}

export async function getSessions(
  search: string,
  offset: number
): Promise<{
  sessions: SelectHostData[];
  newOffset: number | null;
  totalSessions: number;
}> {
  // Always search the full table (max 1000), not per page
  if (search) {
    return {
      sessions: await db
        .select()
        .from(hostData)
        .where(ilike(hostData.topic, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalSessions: 0
    };
  }

  if (offset === null) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }

  let totalSessions = await db.select({ count: count() }).from(hostData);
  if (totalSessions[0].count === 0) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }
  let allSessions = await db.query.hostData.findMany({
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
  
  await db.delete(hostData).where(eq(hostData.id, id));
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
          // console.log(`UserData found for session ${record.key}:`, uData);
          acc[userRecord.key] = uData;
        }
        return acc;
      }, {} as Record<string, UserSessionData>),
    };
    // console.log(`Accumulating session data for ${record.key}:`, entry);
    const accumulated = accumulateSessionData(entry);
    accumulatedSessions[record.key] = accumulated;
  });
  const sortedSessions = Object.entries(accumulatedSessions)
    .sort(([, a], [, b]) => new Date(b.session_data.start_time).getTime() - new Date(a.session_data.start_time).getTime())
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  return sortedSessions;
}