'use server';
import { createKysely } from '@vercel/postgres-kysely';
import { RawBuilder, sql } from 'kysely';
import * as s from './schema';
import { getSession } from '@auth0/nextjs-auth0';
import {
  AllSessionsData,
  HostAndSessionData,
  HostSessionData,
  UserSessionData,
} from './types';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { useUser } from '@auth0/nextjs-auth0/client';
// Only set WebSocket constructor on the server side. Needed for db communication.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Nope, not running on the server.');
}

const db = createKysely<s.Databases>();

export async function getHostAndUserSessions(
  n: number = 100
): Promise<Record<string, HostAndSessionData>> {
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

  const allData: AllSessionsData = {};
  hostSessions.forEach((host) => {
    if (host.id !== null) {
      allData[host.id] = {
        host_data: host,
        user_data: userSessions
          .filter((user) => user.session_id === host.id)
      };
    }
  });

  // console.log('Accumulated sessions from Vercel:', accumulatedSessions);

  return allData;
}

export async function getHostSessionById(id: string): Promise<s.HostSession[]> {
  try {
    return await db
      .selectFrom('host_data')
      .where('host_data.id', '=', id)
      .selectAll()
      .execute();
  } catch (error) {
    console.error('Error getting host session by ID:', error);
    throw error;
  }
}

export async function getHostAndAssociatedUserSessions(
  session_id: string
): Promise<HostAndSessionData> {
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
    console.log('Inserting host session with data:', data);
    const result = await db
      .insertInto('host_data')
      .values(data)
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
    await db
      .insertInto('host_data')
      .values(data)
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
  data:
    | s.HostSessionUpdate
    | { [K in keyof s.HostSessionUpdate]: RawBuilder<unknown> }
): Promise<void> {
  try {
    console.log('Updating host session with id:', id, ' with data:', data);
    await db
      .updateTable('host_data')
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
    await db.deleteFrom('host_data').where('id', '=', id).execute();
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
      .selectFrom('user_data')
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
      .insertInto('user_data')
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
      .insertInto('user_data')
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
    await db.updateTable('user_data').set(data).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error updating user session:', error);
    throw error;
  }
}

export async function deleteUserSession(id: string): Promise<void> {
  try {
    await db.deleteFrom('user_data').where('id', '=', id).execute();
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
      .selectFrom('user_data')
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
    await db.deleteFrom('host_data').where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting session by ID:', error);
    throw error;
  }
}