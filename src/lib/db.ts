'use server';
import { getSession as authGetSession } from '@auth0/nextjs-auth0';
import * as s from './schema_updated';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { deleteAssistants } from 'app/api/gptUtils';
// Only set WebSocket constructor on the server side. Needed for db communication.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Nope, not running on the server.');
}

// const isProd = process.env.NODE_ENV === 'production';
// const prefix = isProd ? 'prod' : 'dev';
// const hostTableName = prefix + '_host_db';
// const userTableName = prefix + '_user_db';
// const messageTableName = prefix + '_messages_db';


const hostTableName = 'prod_host_db';
const userTableName = 'prod_user_db';
const messageTableName = 'prod_messages_db';
interface Databases {
  [hostTableName]: s.HostSessionsTable;
  [userTableName]: s.UserSessionsTable;
  [messageTableName]: s.MessagesTable;
}

let dbConfig = s.createProdDbInstanceWithDbNames<Databases>(hostTableName, userTableName, messageTableName);
const db = dbConfig.db;


async function getAuthForClient() {
  const authSession = await authGetSession();
  // console.log('Session: ', JSON.stringify(authSession, null, 2));
  const userSub = authSession?.user?.sub || '';
  const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',') : [];
  if (adminIds.includes(userSub)) {
    return undefined;
  }
  return userSub;
}

export async function getHostSessions(
  columns: (keyof s.HostSessionsTable)[]
): Promise<s.HostSession[]> {
  const client = await getAuthForClient();

  let query = db
    .selectFrom(hostTableName)
    .select(columns);
  
  if (client) {
    query = query.where('client', '=', client);
  }
  return query
    .orderBy('start_time', 'desc')
    .execute();
}

export async function getHostSessionById(id: string): Promise<s.HostSession> {
  try {
    return await db
      .selectFrom(hostTableName)
      .where(`id`, '=', id)
      .selectAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error('Error getting host session by ID:', error);
    throw error;
  }
}

export async function getFromHostSession(id: string, column: keyof s.HostSessionsTable) {
  const result = await db
    .selectFrom(hostTableName)
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
      .insertInto(hostTableName)
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
      .insertInto(hostTableName)
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
      .updateTable(hostTableName)
      .set(data as any)
      .where('id', '=', id)
      .execute();
  } catch (error) {
    console.error('Error updating host session:', error);
    throw error;
  }
}

export async function increaseSessionsCount(id: string, toIncrease: 'num_sessions' | 'num_finished') {
  // This is a bit clumsy, but I couldn't find a way with kysely to do it in one go. Submitting sql`...` breaks it :-(
  const previousNum = (await db
    .selectFrom(hostTableName)
    .where('id', '=', id)
    .select(toIncrease)
    .executeTakeFirstOrThrow())[toIncrease];
  updateHostSession(id, {[toIncrease]: previousNum+1})
}

export async function deleteHostSession(id: string): Promise<void> {
  try {
    await db.deleteFrom(hostTableName).where('id', '=', id).execute();
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
      .selectFrom(userTableName)
      .where('session_id', '=', sessionId)
      .selectAll()
      .execute();
  } catch (error) {
    console.error('Error getting user session by ID:', error);
    throw error;
  }
}

export async function insertUserSession(
  data: s.NewUserSession
): Promise<string> {
  try {
    console.log('Inserting user session with data:', data);
    const result = await db
      .insertInto(userTableName)
      .values(data)
      .returning('id')
      .executeTakeFirstOrThrow();
    return result.id;
  } catch (error) {
    console.error('Error inserting user session:', error);
    throw error;
  }
}


export async function insertUserSessions(
  data: s.NewUserSession | s.NewUserSession[]
): Promise<string[]> {
  try {
    console.log('Inserting user session with data:', data);
    const result = await db
      .insertInto(userTableName)
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
      .insertInto(userTableName)
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
    await db.updateTable(userTableName).set(data).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error updating user session:', error);
    throw error;
  }
}

export async function deleteUserSession(id: string): Promise<void> {
  try {
    await db.deleteFrom(userTableName).where('id', '=', id).execute();
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
      .selectFrom(userTableName)
      .where(columnName, 'ilike', `%${searchTerm}%`)
      .selectAll()
      .execute();
  } catch (error) {
    console.error('Error searching user sessions:', error);
    throw error;
  }
}

export async function getNumberOfTotalAndFinishedThreads(sessions: s.HostSession[]) {
  // console.log('Getting number of active and inactive threads for sessions');
  const sessionIds = sessions.map(session => session.id);
  if (sessionIds.length === 0) return [];
  const result = await db
    .selectFrom(hostTableName)
    .leftJoin(userTableName, `${userTableName}.session_id`, `${hostTableName}.id`)
    .where(`${hostTableName}.id`, 'in', sessionIds)
    .select(({ fn }) => [
      `${hostTableName}.id`,
      fn.countAll().as('total_users'),
      fn.countAll()
        .filterWhere(`${userTableName}.active`, '=', false)
        .as('finished_users')
    ])
    .groupBy(`${hostTableName}.id`)
    .execute()

  return result
}

export async function insertChatMessage(message: s.NewMessage) {
  console.log("Inserting chat message: ", JSON.stringify(message));
  try {
    await db.insertInto(messageTableName).values(message).execute();
  } catch (error) {
    console.error('Error inserting chat message: ', error)
  }
}

export async function countChatMessages(threadId: string) {
  const result = await db.selectFrom(messageTableName)
    .where('thread_id', '=', threadId)
    .select(({ fn }) => [fn.count('id').as('count')])
    .executeTakeFirst();
  
  return Number(result?.count ?? 0);
}

export async function getAllChatMessagesInOrder(threadId: string) {
  return await db.selectFrom(messageTableName)
    .where('thread_id', '=', threadId)
    .selectAll()
    .orderBy('created_at', 'asc')
    .execute();
}

export async function deleteSessionById(id: string): Promise<boolean> {
  try {
    // before deleting, we need to get the assistant id so that we can delete that as well.
    const assistantId = await db
      .selectFrom(hostTableName)
      .select('template')
      .where('id', '=', id)
      .executeTakeFirst();
    if (assistantId?.template) {
      deleteAssistants([assistantId.template]);
    }
    await db.deleteFrom(hostTableName).where('id', '=', id).execute();
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
      .updateTable(hostTableName)
      .set({ active: false })
      .where('id', '=', sessionId)
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Error deactivating host session:', error);
    return false;
  }
}
