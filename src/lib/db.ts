'use server';
import { getSession as authGetSession } from '@auth0/nextjs-auth0';
import { Kysely, PostgresDialect } from 'kysely';
import * as s from './schema_updated';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import pg from 'pg';
import { deleteAssistants } from 'app/api/gptUtils';
// Only set WebSocket constructor on the server side. Needed for db communication.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Nope, not running on the server.');
}

const hostDbName = 'host_temp_trial';
const userDbName = 'user_temp_trial';
const messageDbName = 'message_temp_trial';
interface Databases {
  [hostDbName]: s.HostSessionsTable;
  [userDbName]: s.UserSessionsTable;
  [messageDbName]: s.MessagesTable;
}
// const db = createKysely<Databases>();
const connectionUrl = `postgresql://${process.env.LOCAL_DB_USER_PWD}@localhost:5432/local_verceldDb`;

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: connectionUrl,
    max: 10,
  }),
});
const db = new Kysely<Databases>({ dialect });

async function getAllowedClientId() {
  const session = await authGetSession();
  const userSub = session?.user?.sub || '';
  const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',') : [];
  if (adminIds.includes(userSub)) {
    return '*';
  }
  return userSub;
}

export async function getHostSessions(
  columns: (keyof s.HostSessionsTable)[]
): Promise<s.HostSession[]> {
  const client = await getAllowedClientId();

  return await db
    .selectFrom(hostDbName)
    .select(columns)
    .where('client', '=', client)
    .orderBy('start_time', 'desc')
    .execute();
}

export async function getHostSessionById(id: string): Promise<s.HostSession> {
  try {
    return await db
      .selectFrom(hostDbName)
      .where(`${hostDbName}.id`, '=', id)
      .selectAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error('Error getting host session by ID:', error);
    throw error;
  }
}

export async function getFromHostSession(id: string, column: keyof s.HostSessionsTable) {
  const result = await db
    .selectFrom(hostDbName)
    .select(column)
    .where('id', '=', id)
    .executeTakeFirst();
  return result?.[column];
}

export async function insertHostSessions(
  data: s.NewHostSession | s.NewHostSession[]
): Promise<string[]> {
  try {
    const session = await authGetSession();
    const userSub = session?.user?.sub || '';
    console.log('Inserting host session with data:', data);
    const result = await db
      .insertInto(hostDbName)
      .values({ ...data, client: userSub })
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
    const userSub = session?.user?.sub || '';
    await db
      .insertInto(hostDbName)
      .values({ ...data, client: userSub })
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

export async function getUsersBySessionId(
  sessionId: string
): Promise<s.UserSession[]> {
  try {
    return await db
      .selectFrom(userDbName)
      .where('session_id', '=', sessionId)
      .selectAll()
      .execute();
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

export async function insertChatMessage(message: s.NewMessage) {
  await db.insertInto(messageDbName).values(message).execute();
}

export async function countChatMessages(threadId: string) {
  const result = await db.selectFrom(messageDbName)
    .where('thread_id', '=', threadId)
    .select(({ fn }) => [fn.count('id').as('count')])
    .executeTakeFirst();
  
  return Number(result?.count ?? 0);
}

export async function getAllChatMessagesInOrder(threadId: string) {
  return await db.selectFrom(messageDbName)
    .where('thread_id', '=', threadId)
    .selectAll()
    .orderBy('created_at', 'asc')
    .execute();
}

export async function deleteSessionById(id: string): Promise<boolean> {
  try {
    // before deleting, we need to get the assistant id so that we can delete that as well.
    const assistantId = await db
      .selectFrom(hostDbName)
      .select('template')
      .where('id', '=', id)
      .executeTakeFirst();
    if (assistantId?.template) {
      deleteAssistants([assistantId.template]);
    }
    await db.deleteFrom(hostDbName).where('id', '=', id).execute();
    // TODO: not deleting user sessions for now, we might want to analyse things?
    // await db.deleteFrom(userDbName).where('session_id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting session by ID:', error);
    throw error;
  }
  return true;
}

export async function deactivateHostSession(
  sessionId: string
): Promise<boolean> {
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
