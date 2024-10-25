import { count, eq, ilike, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as s from './schema';
import {
  host_data,
  user_data,
  InsertHostData,
  SelectHostData,
  InsertUserData,
} from './schema';

import {
  AccumulatedSessionData,
  RawSessionData,
  RawSessionOverview,
  SessionOverview,
  UserSessionData,
} from './types';
import { accumulateSessionData } from '@/lib/utils';

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql, { schema: s });

export async function getHostSessionById(
  id: string
): Promise<SelectHostData | null> {
  const result = await db.query.host_data.findFirst({
    where: eq(host_data.id, id),
    with: {
      userData: true,
    },
  });
  return result;
}

export async function insertHostSession(
  data: InsertHostData
): Promise<void> {
  await db.insert(host_data).values(data);
}

export async function updateHostSession(
  id: string,
  data: Partial<InsertHostData>
): Promise<void> {
  await db.update(host_data).set(data).where(eq(host_data.id, id));
}

export async function deleteHostSession(id: string): Promise<void> {
  await db.delete(host_data).where(eq(host_data.id, id));
}

export async function getUserSessionById(
  id: string
): Promise<UserSessionData | null> {
  const result = await db.query.user_data.findFirst({
    where: eq(user_data.id, id),
  });
  return result;
}

export async function insertUserSession(
  data: InsertUserData
): Promise<void> {
  db.insert(user_data).values(data);
}

export async function updateUserSession(
  id: string,
  data: Partial<InsertUserData>
): Promise<void> {
  await db.update(user_data).set(data).where(eq(user_data.id, id));
}

export async function deleteUserSession(id: string): Promise<void> {
  await db.delete(user_data).where(eq(user_data.id, id));
}

export async function searchHostSessions(
  searchTerm: string
): Promise<SelectHostData[]> {
  return db.query.host_data.findMany({
    where: ilike(host_data.topic, `%${searchTerm}%`),
    with: {
      userData: true,
    },
    orderBy: desc(host_data.startTime),
  });
}

export async function getHostAndUserSessions(
  n: number = 100
): Promise<Record<string, AccumulatedSessionData>> {
  console.log('Getting sessions from database...');

  const sessions = await db.query.host_data.findMany({
    orderBy: desc(host_data.startTime),
    limit: n,
    with: {
      userData: true,
    },
  });

  console.log(`Session from hostAndUserDb: `, sessions);

  const accumulatedSessions: Record<string, AccumulatedSessionData> = {};
  sessions.forEach((session) => {
    accumulatedSessions[session.id.toString()] = {
      session_data: {
        session_active: session.active,
        num_sessions: session.numSessions,
        num_active: session.numSessions - session.finished,
        num_finished: session.finished,
        summary: session.summary,
        template: session.template,
        topic: session.topic,
        context: session.context,
        finalReportSent: session.finalReportSent,
        start_time: new Date(session.startTime),
        client: session.client,
      },
      user_data: session.userData.reduce((acc, user) => {
        acc[user.id.toString()] = user;
        return acc;
      }, {} as Record<string, UserSessionData>),
    };
  });

  console.log('Accumulated sessions from Vercel:', accumulatedSessions);

  return accumulatedSessions;
}

export async function searchByTopic(
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
        .from(host_data)
        .where(ilike(host_data.topic, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalSessions: 0,
    };
  }

  if (offset === null) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }

  let totalSessions = await db.select({ count: count() }).from(host_data);
  if (totalSessions[0].count === 0) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }
  let allSessions = await db.query.host_data.findMany({
    limit: 20,
    offset: offset,
    orderBy: (sessions, { desc }) => [desc(sessions.id)],
  });

  // select().from(sessions).limit(5).offset(offset);
  // let newOffset = moreSessions.length >= 5 ? offset + 5 : null;
  let newOffset = null;

  return {
    sessions: allSessions,
    newOffset,
    totalSessions: totalSessions[0].count,
  };
}

export async function deleteSessionById(id: string) {
  await db.delete(host_data).where(eq(host_data.id, id));
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
      session_data: {
        ...(record.data as RawSessionOverview),
        session_id: record.key,
      },
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
    .sort(
      ([, a], [, b]) =>
        new Date(b.session_data.start_time).getTime() -
        new Date(a.session_data.start_time).getTime()
    )
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  return sortedSessions;
}
