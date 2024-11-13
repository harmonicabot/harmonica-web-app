'use server';
import { createKysely } from '@vercel/postgres-kysely';
import { getSession as authGetSession } from '@auth0/nextjs-auth0';
import { RawBuilder } from 'kysely';
import * as s from './schema';
import {
  AllSessionsData,
  HostAndUserData,
} from './types';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
// Only set WebSocket constructor on the server side. Needed for db communication.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Nope, not running on the server.');
}

const userDbName = 'user_db';
const hostDbName = 'host_db';
interface Databases {
  [hostDbName]: s.HostSessionsTable;
  [userDbName]: s.UserSessionsTable;
}
const db = createKysely<Databases>();

export async function getHostAndUserSessions(
  n: number = 100,
): Promise<Record<string, HostAndUserData>> {
  const session = await authGetSession();
  const userSub = session?.user?.sub || "";

  const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',') : [];

  let hostQuery;

  if (adminIds.includes(userSub)) {
      hostQuery = db
        .selectFrom(hostDbName)
        .orderBy('start_time', 'desc')
        .limit(n)
        .selectAll();
  } else if (userSub) {
    hostQuery = db
      .selectFrom(hostDbName)
      .where('client', '=', userSub)
      .orderBy('start_time', 'desc')
      .limit(n)
      .selectAll();
  } else {
    return {}; // Return empty object if clientEmail is not set
  }

  const hostSessions = await hostQuery.execute();
  // Return early if no host sessions found
  if (!hostSessions.length) {
    return {};
  }

  const userQuery = db
    .selectFrom(userDbName)
    .where(
      'session_id',
      'in',
      hostSessions.map((h) => h.id)
    )
    .selectAll();

  console.log(`User query: `, userQuery.compile().sql);
  const userSessions = await userQuery.execute();

  const allData: AllSessionsData = {};
  hostSessions.forEach((host) => {
    if (host.id !== null) {
      allData[host.id] = {
        host_data: host,
        user_data: userSessions.filter((user) => user.session_id === host.id)
      };
    }
  });

  return allData;
}

export async function getHostSessionById(id: string): Promise<s.HostSession[]> {
  try {
    return await db
      .selectFrom(hostDbName)
      .where(`${hostDbName}.id`, '=', id)
      .selectAll()
      .execute();
  } catch (error) {
    console.error('Error getting host session by ID:', error);
    throw error;
  }
}

export async function getHostAndAssociatedUserSessions(
  session_id: string
): Promise<HostAndUserData> {
  try {
    const hostSession: s.HostSession = (
      await getHostSessionById(session_id)
    )[0];

    const userSessions = await searchUserSessions('session_id', session_id);
    
    return {
      host_data: hostSession,
      user_data: userSessions,
    };
  } catch (error) {
    console.error('Error getting host session by ID:', error);
    throw error;
  }
}

export async function insertHostSessions(
  data: s.NewHostSession | s.NewHostSession[]
): Promise<string[]> {
  try {
    const session = await authGetSession();
    const userSub = session?.user?.sub || "";
    console.log('Inserting host session with data:', data);
    const result = await db
      .insertInto(hostDbName)
      .values({...data, client: userSub})
      .returningAll()
      .execute();
    return result.map((row) => row.id);
  } catch (error) {
    console.error('Error inserting host sessions:', error);
    throw error;
  }
}

export async function upsertHostSession(
  data: s.NewHostSession,
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  try {
    const session = await authGetSession();
    const userSub = session?.user?.sub || "";
    await db
      .insertInto(hostDbName)
      .values({...data, client: userSub})
      .onConflict((oc) =>
        onConflict === 'skip'
          ? oc.column('id').doNothing()
          : oc.column('id').doUpdateSet(data)
      )
      .execute();
  } catch (error) {
    console.error('Error upserting host session:', error);
    throw error;
  }
}

export async function updateHostSession(
  id: string,
  data: s.HostSessionUpdate
): Promise<void> {
  try {
    console.log('Updating host session with id:', id, ' with data:', data);
    await db
      .updateTable(hostDbName)
      .set(data as any)
      .where('id', '=', id)
      .execute();
  } catch (error) {
    console.error('Error updating host session:', error);
    throw error;
  }
}

export async function deleteHostSession(id: string): Promise<void> {
  try {
    await db.deleteFrom(hostDbName).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting host session:', error);
    throw error;
  }
}

export async function getUserSessionById(
  id: string
): Promise<s.UserSession | undefined> {
  try {
    return await db
      .selectFrom(userDbName)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  } catch (error) {
    console.error('Error getting user session by ID:', error);
    throw error;
  }
}

export async function insertUserSessions(
  data: s.NewUserSession | s.NewUserSession[]
): Promise<string[]> {
  try {
    console.log('Inserting user session with data:', data);
    const result = await db
      .insertInto(userDbName)
      .values(data)
      .returningAll()
      .execute();
    return result.map((row) => row.id);
  } catch (error) {
    console.error('Error inserting user sessions:', error);
    throw error;
  }
}

export async function upsertUserSession(
  data: s.NewUserSession,
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  try {
    await db
      .insertInto(userDbName)
      .values(data)
      .onConflict((oc) =>
        onConflict === 'skip'
          ? oc.column('id').doNothing()
          : oc.column('id').doUpdateSet(data)
      )
      .execute();
  } catch (error) {
    console.error('Error upserting user session:', error);
    throw error;
  }
}

export async function updateUserSession(
  id: string,
  data: s.UserSessionUpdate
): Promise<void> {
  try {
    console.log('Updating user session with id:', id, ' with data:', data);
    await db.updateTable(userDbName).set(data).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error updating user session:', error);
    throw error;
  }
}

export async function deleteUserSession(id: string): Promise<void> {
  try {
    await db.deleteFrom(userDbName).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting user session:', error);
    throw error;
  }
}

export async function searchUserSessions(
  columnName: keyof s.UserSessionsTable,
  searchTerm: string
): Promise<s.UserSession[]> {
  try {
    return await db
      .selectFrom(userDbName)
      .where(columnName, 'ilike', `%${searchTerm}%`)
      .selectAll()
      .execute();
  } catch (error) {
    console.error('Error searching user sessions:', error);
    throw error;
  }
}

export async function deleteSessionById(id: string): Promise<void> {
  try {
    await db.deleteFrom(hostDbName).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting session by ID:', error);
    throw error;
  }
}

export async function deactivateHostSession(sessionId: string): Promise<boolean> {
  try {
    const result = await db
      .updateTable(hostDbName)
      .set({ active: false })
      .where('id', '=', sessionId)
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Error deactivating host session:', error);
    return false; 
  }
}