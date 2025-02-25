'use server';
import { getSession as authGetSession } from '@auth0/nextjs-auth0';
import * as s from './schema';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { deleteAssistants } from 'app/api/gptUtils';
import { ResultTabsVisibilityConfig } from './types';

// Only set WebSocket constructor on the server side. Needed for db communication.
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('Nope, not running on the server.');
}

const hostTableName = 'host_db';
const userTableName = 'user_db';
const messageTableName = 'messages_db';
const customResponsesTableName = 'custom_responses';
const workspaceTableName = 'workspaces';
const workspaceSessionsTableName = 'workspace_sessions';
const permissionsTableName = 'permissions';

interface Databases {
  [hostTableName]: s.HostSessionsTable;
  [userTableName]: s.UserSessionsTable;
  [messageTableName]: s.MessagesTable;
  [customResponsesTableName]: s.CustomResponsesTable;
  [workspaceTableName]: s.WorkspacesTable;
  [workspaceSessionsTableName]: s.WorkspaceSessionsTable;
  [permissionsTableName]: s.PermissionsTable;
}

const dbPromise = (async () => {
  const url = process.env.POSTGRES_URL;
  console.log('Using database url: ', url);
  const db = await s.createDbInstance<Databases>();
  return db;
})();

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
  columns: (keyof s.HostSessionsTable)[],
  page: number = 1,
  pageSize: number = 100,
): Promise<s.HostSession[]> {
  const db = await dbPromise;
  console.log('Database call to getHostSessions at:', new Date().toISOString());
  const client = await getAuthForClient();

  let query = db.selectFrom(hostTableName).select(columns);

  if (client) {
    query = query.where('client', '=', client);
  }
  return query
    .orderBy('start_time', 'desc')
    .limit(pageSize)
    .offset(Math.max(0, page - 1) * pageSize)
    .execute();
}

export async function getHostSessionById(
  sessionId: string,
): Promise<s.HostSession> {
  const db = await dbPromise;
  console.log('ID: ', sessionId);
  try {
    return await db
      .selectFrom(hostTableName)
      .where(`id`, '=', sessionId)
      .selectAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    console.error('Error getting host session by ID:', error);
    throw error;
  }
}

export async function getFromHostSession(
  sessionId: string,
  columns: (keyof s.HostSessionsTable)[],
) {
  const db = await dbPromise;
  const result = await db
    .selectFrom(hostTableName)
    .select(columns)
    .where('id', '=', sessionId)
    .executeTakeFirst();
  return result;
}

export async function insertHostSessions(
  data: s.NewHostSession | s.NewHostSession[],
): Promise<string[]> {
  const db = await dbPromise;
  try {
    // Due to GDPR, we don't want to store identifiable user data...
    // But, we kind of have to, otherwise we wouldn't be able to have 'private' sessions at all and all editing etc would be public :-/
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
  onConflict: 'skip' | 'update' = 'skip',
): Promise<void> {
  const db = await dbPromise;
  try {
    // Due to GDPR we don't want to store identifiable user data
    // But, we kind of have to, otherwise we wouldn't be able to have 'private' sessions at all and all editing etc would be public :-/
    const session = await authGetSession();
    const userSub = session?.user?.sub || '';
    await db
      .insertInto(hostTableName)
      .values({ ...data, client: userSub })
      .onConflict((oc) =>
        onConflict === 'skip'
          ? oc.column('id').doNothing()
          : oc.column('id').doUpdateSet(data),
      )
      .execute();
  } catch (error) {
    console.error('Error upserting host session:', error);
    throw error;
  }
}

export async function updateHostSession(
  id: string,
  data: s.HostSessionUpdate,
): Promise<void> {
  const db = await dbPromise;
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

export async function increaseSessionsCount(
  id: string,
  toIncrease: 'num_sessions' | 'num_finished',
) {
  // This is a bit clumsy, but I couldn't find a way with kysely to do it in one go. Submitting sql`...` breaks it :-(
  const db = await dbPromise;
  const previousNum = (
    await db
      .selectFrom(hostTableName)
      .where('id', '=', id)
      .select(toIncrease)
      .executeTakeFirstOrThrow()
  )[toIncrease];
  updateHostSession(id, { [toIncrease]: previousNum + 1 });
}

export async function deleteHostSession(id: string): Promise<void> {
  try {
    const db = await dbPromise;
    await db.deleteFrom(hostTableName).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting host session:', error);
    throw error;
  }
}

export async function getUsersBySessionId(
  sessionId: string,
  columns: (keyof s.UserSessionsTable)[] = [],
): Promise<s.UserSession[]> {
  try {
    const db = await dbPromise;
    let query = db
      .selectFrom(userTableName)
      .where('session_id', '=', sessionId);
    if (columns.length > 0) return await query.select(columns).execute();
    else return await query.selectAll().execute();
  } catch (error) {
    console.error('Error getting user session by ID:', error);
    throw error;
  }
}

export async function insertUserSessions(
  data: s.NewUserSession | s.NewUserSession[],
): Promise<string[]> {
  try {
    const db = await dbPromise;
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

export async function updateUserSession(
  id: string,
  data: s.UserSessionUpdate,
): Promise<void> {
  try {
    const db = await dbPromise;
    console.log('Updating user session with id:', id, ' with data:', data);
    await db
      .updateTable(userTableName)
      .set(data)
      .where('id', '=', id)
      .execute();
  } catch (error) {
    console.error('Error updating user session:', error);
    throw error;
  }
}

export async function deleteUserSession(id: string): Promise<void> {
  try {
    const db = await dbPromise;
    await db.deleteFrom(userTableName).where('id', '=', id).execute();
  } catch (error) {
    console.error('Error deleting user session:', error);
    throw error;
  }
}

export async function searchUserSessions(
  columnName: keyof s.UserSessionsTable,
  searchTerm: string,
): Promise<s.UserSession[]> {
  try {
    const db = await dbPromise;
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

export async function getNumUsersAndMessages(sessionIds: string[]) {
  if (sessionIds.length === 0) return {};

  const db = await dbPromise;
  const result = await db
    .selectFrom(hostTableName)
    .leftJoin(
      userTableName,
      `${userTableName}.session_id`,
      `${hostTableName}.id`,
    )
    .leftJoin(
      messageTableName,
      `${messageTableName}.thread_id`,
      `${userTableName}.thread_id`,
    )
    .where(`${hostTableName}.id`, 'in', sessionIds)
    .select(({ fn }) => [
      `${hostTableName}.id as sessionId`,
      `${userTableName}.id as userId`,
      `${userTableName}.active`,
      fn.count(`${messageTableName}.id`).as('message_count'),
    ])
    .groupBy([
      `${hostTableName}.id`,
      `${userTableName}.id`,
      `${userTableName}.active`,
    ])
    .execute();

  const stats: Record<
    string,
    Record<string, { num_messages: number; finished: boolean }>
  > = {};

  for (const row of result) {
    if (!stats[row.sessionId]) {
      stats[row.sessionId] = {};
    }
    if (row.userId) {
      stats[row.sessionId][row.userId] = {
        num_messages: Number(row.message_count),
        finished: !row.active,
      };
    }
  }

  return stats;
}

export async function insertChatMessage(message: s.NewMessage) {
  console.log('Inserting chat message: ', JSON.stringify(message));
  try {
    const db = await dbPromise;
    await db.insertInto(messageTableName).values(message).execute();
  } catch (error) {
    console.error('Error inserting chat message: ', error);
  }
}

export async function getAllChatMessagesInOrder(threadId: string) {
  const db = await dbPromise;
  return await db
    .selectFrom(messageTableName)
    .where('thread_id', '=', threadId)
    .selectAll()
    .orderBy('created_at', 'asc')
    .execute();
}

export async function getAllMessagesForUsersSorted(
  users: s.UserSession[],
): Promise<s.Message[]> {
  if (users.length === 0) return [];
  const db = await dbPromise;
  const messages = await db
    .selectFrom(messageTableName)
    .where(
      'thread_id',
      'in',
      users.map((user) => user.thread_id),
    )
    .selectAll()
    .orderBy('created_at', 'asc')
    .execute();
  return messages;
}

export async function getAllMessagesForSessionSorted(
  sessionId: string,
): Promise<s.Message[]> {
  if (!sessionId) return [];

  const db = await dbPromise;
  const messages = await db
    .selectFrom(hostTableName)
    .innerJoin(
      userTableName,
      `${userTableName}.session_id`,
      `${hostTableName}.id`,
    )
    .innerJoin(
      messageTableName,
      `${messageTableName}.thread_id`,
      `${userTableName}.thread_id`,
    )
    .where(`${hostTableName}.id`, '=', sessionId)
    .selectAll(`${messageTableName}`)
    .orderBy(`${messageTableName}.created_at`, 'asc')
    .execute();

  return messages;
}

export async function deleteSessionById(id: string): Promise<boolean> {
  try {
    // before deleting, we need to get the assistant id so that we can delete that as well.
    const db = await dbPromise;
    const session = await db
      .selectFrom(hostTableName)
      .select('assistant_id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (session?.assistant_id) {
      deleteAssistants([session.assistant_id]);
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
  sessionId: string,
): Promise<boolean> {
  try {
    const db = await dbPromise;
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

export async function createCustomResponse(
  customResponse: s.NewCustomResponse,
): Promise<s.CustomResponse | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .insertInto(customResponsesTableName)
      .values(customResponse)
      .returningAll()
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error creating custom response:', error);
    return null;
  }
}

export async function getCustomResponseById(
  id: string,
): Promise<s.CustomResponse | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom(customResponsesTableName)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error getting custom response by ID:', error);
    return null;
  }
}

export async function getCustomResponsesBySessionOrWorkspaceId(
  sessionId: string,
): Promise<s.CustomResponse[]> {
  try {
    const db = await dbPromise;
    const responses = await db
      .selectFrom(customResponsesTableName)
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy('position', 'asc')
      .execute();

    return responses;
  } catch (error) {
    console.error('Error getting custom responses by session ID:', error);
    return [];
  }
}

export async function updateCustomResponse(
  id: string,
  update: s.CustomResponseUpdate,
): Promise<s.CustomResponse | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .updateTable(customResponsesTableName)
      .set(update)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error updating custom response:', error);
    return null;
  }
}

export async function deleteCustomResponse(id: string): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db
      .deleteFrom(customResponsesTableName)
      .where('id', '=', id)
      .execute();

    return true;
  } catch (error) {
    console.error('Error deleting custom response:', error);
    return false;
  }
}

// Workspace CRUD operations
export async function createWorkspace(
  workspace: s.NewWorkspace,
): Promise<s.Workspace | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .insertInto('workspaces')
      .values(workspace)
      .returningAll()
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error creating workspace:', error);
    return null;
  }
}

export async function getWorkspaceSummary(
  workspaceId: string,
): Promise<string> {
  const db = await dbPromise;
  const result = await db
    .selectFrom('workspaces')
    .select('summary')
    .where('id', '=', workspaceId)
    .executeTakeFirst();
  return result?.summary || '';
}

export async function getWorkspaceById(
  id: string,
): Promise<s.Workspace | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom('workspaces')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error getting workspace by ID:', error);
    return null;
  }
}

export async function getAllWorkspaceIds(): Promise<{ id: string }[]> {
  try {
    const db = await dbPromise;
    const result = await db.selectFrom('workspaces').select('id').execute();

    return result;
  } catch (error) {
    console.error('Error getting all workspace IDs:', error);
    return [];
  }
}

export async function updateWorkspace(
  id: string,
  update: s.WorkspaceUpdate,
): Promise<s.Workspace | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .updateTable('workspaces')
      .set(update)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error updating workspace:', error);
    return null;
  }
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db.deleteFrom('workspaces').where('id', '=', id).execute();

    return true;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return false;
  }
}

// Workspace Sessions operations
export async function addSessionToWorkspace(
  workspaceId: string,
  sessionId: string,
): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db
      .insertInto('workspace_sessions')
      .values({ workspace_id: workspaceId, session_id: sessionId })
      .execute();

    return true;
  } catch (error) {
    console.error('Error adding session to workspace:', error);
    return false;
  }
}

export async function removeSessionFromWorkspace(
  workspaceId: string,
  sessionId: string,
): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db
      .deleteFrom('workspace_sessions')
      .where('workspace_id', '=', workspaceId)
      .where('session_id', '=', sessionId)
      .execute();

    return true;
  } catch (error) {
    console.error('Error removing session from workspace:', error);
    return false;
  }
}

export async function getWorkspaceSessions(
  workspaceId: string,
): Promise<string[]> {
  try {
    const db = await dbPromise;
    const results = await db
      .selectFrom('workspace_sessions')
      .select('session_id')
      .where('workspace_id', '=', workspaceId)
      .execute();

    return results.map((r) => r.session_id);
  } catch (error) {
    console.error('Error getting workspace sessions:', error);
    return [];
  }
}

// Permissions operations
export async function setPermission(
  resourceId: string,
  role: 'admin' | 'owner' | 'editor' | 'viewer' | 'none',
  userId?: string,  // Defaults to whatever user is currently logged in
): Promise<boolean> {
  try {
    console.log(`Setting permissions: \nResources: ${resourceId}\nUser: ${userId}\nRole: ${role}`)
    if (!userId) {
      const session = await authGetSession();
      userId = session?.user?.sub;
    }
    if (!userId) {
      console.warn("Could not get user info. Will store session as anonymous.")
    } 
    const db = await dbPromise;
    await db
      .insertInto('permissions')
      .values({ resource_id: resourceId, user_id: userId || 'anonymous', role })
      .onConflict((oc) =>
        oc.columns(['resource_id', 'user_id']).doUpdateSet({ role }),
      )
      .execute();

    return true;
  } catch (error) {
    console.error('Error setting permission:', error);
    return false;
  }
}

export async function getPermission(
  resourceId: string,
  userId: string,
): Promise<{ role: 'admin' | 'owner' | 'editor' | 'viewer' | 'none' } | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom('permissions')
      .select('role')
      .where('resource_id', '=', resourceId)
      .where('user_id', '=', userId)
      .executeTakeFirst();

    console.log(`${userId}'s Permissions for ${resourceId}: `, result?.role)
    return result || null;
  } catch (error) {
    console.error('Error getting permission:', error);
    return null;
  }
}

export async function removePermission(
  resourceId: string,
  userId: string,
): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db
      .deleteFrom('permissions')
      .where('resource_id', '=', resourceId)
      .where('user_id', '=', userId)
      .execute();

    return true;
  } catch (error) {
    console.error('Error removing permission:', error);
    return false;
  }
}

export async function canEdit(
  userId: string,
  resourceId: string,
): Promise<boolean> {
  const db = await dbPromise;
  const permission = await db
    .selectFrom('permissions')
    .select('role')
    .where('user_id', '=', userId)
    .where('resource_id', '=', resourceId)
    .executeTakeFirst();

  return (
    permission?.role === 'owner' ||
    permission?.role === 'editor' ||
    permission?.role === 'admin'
  );
}

export async function updateVisibilitySettings(
  resourceId: string,
  settings: ResultTabsVisibilityConfig
): Promise<void> {
  try {
    const db = await dbPromise;

    // First check if this is a workspace or session ID
    const workspace = await db
      .selectFrom('workspaces')
      .select('id')
      .where('id', '=', resourceId)
      .executeTakeFirst();

    if (workspace) {
      // Update workspace settings
      await db
        .updateTable('workspaces')
        .set({ visibility_settings: settings })
        .where('id', '=', resourceId)
        .execute();
    } else {
      // Update session settings  
      await db
        .updateTable('host_db')
        .set({ visibility_settings: settings })
        .where('id', '=', resourceId)
        .execute();
    }
  } catch (error) {
    console.error('Error updating visibility settings:', error);
    throw error;
  }
}