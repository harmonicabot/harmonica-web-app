'use server';
import { createKysely } from '@vercel/postgres-kysely';
import * as s from './schema';
import { getSession } from '@auth0/nextjs-auth0';
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
  console.log('Yep, running serverside!');
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Nope, not running on the server.');
}

const db = createKysely<s.Databases>();

export async function getHostAndUserSessions(
  n: number = 100
): Promise<Record<string, AccumulatedSessionData>> {
  console.log('Getting sessions from vercel database...');

  const hostQuery = db
  .selectFrom('host_data')
  .orderBy('start_time', 'desc')
  .limit(n)
  .selectAll();

  const hostSessions = await hostQuery.execute();
  // Return early if no host sessions found
  if (!hostSessions.length) {
    return {};
  }

  const userQuery = db
    .selectFrom('user_data')
    .where(
      'session_id',
      'in',
      hostSessions.map((h) => h.id)
    )
    .selectAll();
  
  console.log(`User query: `, userQuery.compile().sql);
  const userSessions = await userQuery.execute();

  // console.log(`Session from host Db: `, hostSessions);
  // console.log(`Session from user Db: `, userSessions);

  const accumulatedSessions: Record<string, AccumulatedSessionData> = {};
  hostSessions.forEach((host) => {
    if (host.id !== null) {
      accumulatedSessions[host.id] = {
        session_data: {
          id: host.id,
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

  // console.log('Accumulated sessions from Vercel:', accumulatedSessions);

  return accumulatedSessions;
}

export async function getHostSessionById(id: string): Promise<s.HostSession[]> {
  return await db
    .selectFrom('host_data')
    .where('host_data.id', '=', id)
    .selectAll()
    .execute();
}

export async function insertHostSessions(data: s.NewHostSession | s.NewHostSession[]): Promise<void> {
  console.log('Inserting host session with data:', data);
  await db.insertInto('host_data').values(data).execute();
}

export async function upsertHostSession(
  data: s.NewHostSession,
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  await db
    .insertInto('host_data')
    .values(data)
    .onConflict((oc) =>
      onConflict === 'skip'
        ? oc.column("id").doNothing()
        : oc.column("id").doUpdateSet(data)
    )
    .execute();
}

export async function updateHostSession(
  id: string,
  data: s.HostSessionUpdate
): Promise<void> {
  console.log('Updating host session with id:', id, ' with data:', data);
  await db.updateTable('host_data').set(data).where('id', '=', id).execute();
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

export async function insertUserSessions(data: s.NewUserSession | s.NewUserSession[]): Promise<void> {
  console.log('Inserting user session with data:', data);
  await db.insertInto('user_data').values(data).execute();
}

export async function upsertUserSession(
  data: s.NewUserSession,
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  await db
    .insertInto('user_data')
    .values(data)
    .onConflict((oc) =>
      onConflict === 'skip'
        ? oc.column("id").doNothing()
        : oc.column("id").doUpdateSet(data)
    )
    .execute();
}

export async function updateUserSession(
  id: string,
  data: s.UserSessionUpdate
): Promise<void> {
  console.log('Updating user session with id:', id, ' with data:', data);
  await db.updateTable('user_data').set(data).where('id', '=', id).execute();
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

const sessionStore = 17957;
const userStore = 17913;

let limit = 100;
const token = process.env.MAKE_AUTH_TOKEN;

function getUrl(
  storeId: number,
  includeLimit: boolean = true,
  offset: number = 20
) {
  return (
    `https://eu2.make.com/api/v2/data-stores/${storeId}/data` +
    (includeLimit ? '?pg[limit]=' + limit + '&pg[offset]=' + offset : '')
  );
  // + (sortBy? "&pg[sortBy]=" + sortBy : "") // Sorting not allowed for this api 😢
}

type DbResponse = {
  records?: {
    key: string;
    data: UserSessionData | RawSessionOverview;
  }[];
  count: number;
  pg: {
    limit: number;
    offset: number;
  };
};

async function getAllUserData() {
  let offset = 0;
  let batch = await getUserData(offset);
  const allData = batch;
  while (batch.length > 0) {
    offset += limit;
    batch = await getUserData(offset);
    allData.push(...batch);
  }
  return allData;
}

async function getUserData(offset) {
  const results: DbResponse = await fetch(getUrl(userStore, true, offset), {
    method: 'GET',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json());
  return results.records;
}

export async function getSessionsFromMake() {
  console.log('Fetching sessions from Make...');

  const { user } = await getSession();
  const clientId = '';
  try {
    const [sessionData, userData] = await Promise.all([
      fetch(getUrl(sessionStore), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(getUrl(userStore), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    const userJson: DbResponse = await userData.json();
    let sessionJson: DbResponse = await sessionData.json();
    // console.log(`Got session data for ClientID '${clientId}': `, sessionJson.records || []);
    const clientSessions: DbResponse['records'] = [];
    if (!clientId) {
      console.log('Keeping all sessions not belonging to a client');
      // get all sessions that do NOT belong to any client, mainly for internal testing purposes
      const noClientEntries =
        sessionJson.records?.filter(
          (sessionData) =>
            !('client' in sessionData.data) ||
            sessionData.data.client === null ||
            sessionData.data.client === ''
        ) || [];
      clientSessions.push(...noClientEntries);
    } else {
      const withClient =
        sessionJson.records?.filter(
          ({ data }) => (data as RawSessionOverview).client === clientId
        ) || [];
      clientSessions.push(...withClient);
    }
    sessionJson = {
      ...sessionJson,
      records: clientSessions,
      count: clientSessions.length,
    };
    console.log(
      `Session data after filtering ClientID '${clientId}': `,
      sessionJson.records.length
    );
    const expected = userJson.count;
    let available = limit;
    while (expected > available) {
      const batch = await fetch(getUrl(userStore, true, available), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const batchJson = await batch.json();
      if (!userJson.records) {
        userJson.records = [];
      }
      userJson.records.push(...batchJson.records);
      available += limit;
    }
    
    console.log('Got user data: ', userJson.records.length || 0);
    return parseDbItems(userJson, sessionJson);
  } catch (error) {
    console.error(error);
    return { error: `Failed to fetch data: ${error}`, status: 500 };
  }
}

function parseDbItems(userData: DbResponse, sessionData: DbResponse) {
  let accumulatedSessions: Record<string, AccumulatedSessionData> = {};
  sessionData.records.forEach((record) => {
    let entry: RawSessionData = {
      session_data: {
        ...(record.data as RawSessionOverview),
        id: record.key,
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
