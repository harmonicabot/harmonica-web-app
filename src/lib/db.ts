'use server'
import { createKysely } from '@vercel/postgres-kysely';
import * as s from './schema';
import {
  AccumulatedSessionData,
  ApiTarget,
  RawSessionData,
  RawSessionOverview,
  SessionOverview,
  UserSessionData,
} from './types';
import { accumulateSessionData } from '@/lib/utils';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { sql } from 'kysely';
// Only set WebSocket constructor on the server side
if (typeof window === 'undefined') {
  console.log("Yep, running serverside!");
  neonConfig.webSocketConstructor = ws;
} else {
  console.log("Nope, not running on the server.");
}

const db = createKysely<s.Databases>();

// TEMPORARY!!!
export async function seed() {
  const createTable = await db.schema
    .createTable('temp')
    .ifNotExists()
    .addColumn('id', 'serial', (cb) => cb.primaryKey())
    .addColumn('name', 'varchar(255)', (cb) => cb.notNull())
    .addColumn('email', 'varchar(255)', (cb) => cb.notNull().unique())
    .addColumn('image', 'varchar(255)')
    .addColumn('createdAt', sql`timestamp with time zone`, (cb) =>
      cb.defaultTo(sql`current_timestamp`)
    )
    .execute()
  console.log(`Created "temp" table`)
}
// TEMPORARY!!

export async function getHostAndUserSessions(
  n: number = 100
): Promise<Record<string, AccumulatedSessionData>> {
  console.log('Creating temporary table, just to test db connection works...');
  await seed();

  console.log('Generated test db. Now getting sessions from database...');

  const hostSessions = await db
    .selectFrom('host_data')
    .orderBy('start_time', 'desc')
    .limit(n)
    .selectAll()
    .execute();

  const userSessions = await db
    .selectFrom('user_data')
    .where(
      'session_id',
      'in',
      hostSessions.map((h) => h.id)
    )
    .selectAll()
    .execute();

  console.log(`Session from host Db: `, hostSessions);
  console.log(`Session from user Db: `, userSessions);

  const accumulatedSessions: Record<string, AccumulatedSessionData> = {};
  hostSessions.forEach((host) => {
    if (host.id !== null) {
      accumulatedSessions[host.id] = {
        session_data: {
          session_id: host.id,
          session_active: host.active,
          num_sessions: host.num_sessions,
          num_active: host.num_sessions - host.finished,
          num_finished: host.finished,
          summary: host.summary ?? undefined,
          template: host.template ?? '',
          topic: host.topic,
          context: host.context ?? undefined,
          final_report_sent: host.final_report_sent,
          start_time: new Date(host.start_time ?? Date.now()),
          client: host.client ?? undefined,
        },
        user_data:
          userSessions
            .filter((user) => user.session_id === host.id)
            .reduce((acc: Record<string, UserSessionData>, user) => {
              acc[user.id] = {
                ...user,
                feedback: user.feedback ?? undefined,
                chat_text: user.chat_text ?? undefined,
                result_text: user.result_text ?? undefined,
                bot_id: user.bot_id ?? undefined,
                host_chat_id: user.host_chat_id ?? undefined,
              };
              return acc;
            }, {} as Record<string, UserSessionData>) ?? {},
      };
    }
  });

  console.log('Accumulated sessions from Vercel:', accumulatedSessions);

  return accumulatedSessions;
}


export async function getHostSessionById(id: string): Promise<s.HostSession[]> {
  return await db
    .selectFrom('host_data')
    .where('host_data.id', '=', id)
    .selectAll()
    .execute();
}

export async function insertHostSession(data: s.NewHostSession): Promise<void> {
  await db.insertInto('host_data').values(data).execute();
}

export async function updateHostSession(
  id: string,
  data: s.HostSessionUpdate
): Promise<void> {
  await db
    .updateTable('host_data')
    .set(data)
    .where('id', '=', id)
    .execute();
}

export async function deleteHostSession(id: string): Promise<void> {
  await db.deleteFrom('host_data').where('id', '=', id).execute();
}

export async function getUserSessionById(
  id: string
): Promise<s.UserSession | undefined> {
  return await db
    .selectFrom('user_data')
    .where('id', '=', id)
    .selectAll()
    .executeTakeFirst();
}

export async function insertUserSession(data: s.NewUserSession): Promise<void> {
  await db.insertInto('user_data').values(data).execute();
}

export async function updateUserSession(
  id: string,
  data: s.UserSessionUpdate
): Promise<void> {
  await db
    .updateTable('user_data')
    .set(data)
    .where('id', '=', id)
    .execute();
}

export async function deleteUserSession(id: string): Promise<void> {
  await db.deleteFrom('user_data').where('id', '=', id).execute();
}

export async function searchUserSessions(
  columnName: keyof s.UserSessionsTable,
  searchTerm: string
): Promise<s.UserSession[]> {
  return await db
    .selectFrom('user_data')
    .where(columnName, 'ilike', `%${searchTerm}%`)
    .selectAll()
    .execute();
}

export async function searchByTopic(
  search: string,
  offset: number
): Promise<{
  sessions: s.HostSession[];
  newOffset: number | null;
  totalSessions: number;
}> {
  if (search) {
    const sessions = await db
      .selectFrom('host_data')
      .where('topic', 'ilike', `%${search}%`)
      .limit(1000)
      .selectAll()
      .execute();

    return {
      sessions,
      newOffset: null,
      totalSessions: 0,
    };
  }

  if (offset === null) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }

  const totalSessions = await db
    .selectFrom('host_data')
    .select(db.fn.count('id').as('count'))
    .executeTakeFirst();

  if (!totalSessions || totalSessions.count === 0) {
    return { sessions: [], newOffset: null, totalSessions: 0 };
  }

  const allSessions = await db
    .selectFrom('host_data')
    .orderBy('id', 'desc')
    .limit(20)
    .offset(offset)
    .selectAll()
    .execute();

  return {
    sessions: allSessions,
    newOffset: null,
    totalSessions: Number(totalSessions.count),
  };
}

export async function deleteSessionById(id: string): Promise<void> {
  await db.deleteFrom('host_data').where('id', '=', id).execute();
}
export async function getSessionsFromMake() {
  console.log('Fetching sessions from Make...');
  const response = await fetch(`api/${ApiTarget.Sessions}`);
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
