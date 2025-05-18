'use server';
import { getSession as authGetSession } from '@auth0/nextjs-auth0';
import * as s from './schema';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { ResultTabsVisibilityConfig } from './schema';
import { sql } from 'kysely';
import { Role } from './permissions';
import { cache } from 'react';
import { SubscriptionTier } from './schema';

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
const invitationsTableName = 'invitations';
const usersTableName = 'users';
const promptsTableName = 'prompts';
const promptTypesTableName = 'prompt_type';

interface Databases {
  [hostTableName]: s.HostSessionsTable;
  [userTableName]: s.UserSessionsTable;
  [messageTableName]: s.MessagesTable;
  [customResponsesTableName]: s.CustomResponsesTable;
  [workspaceTableName]: s.WorkspacesTable;
  [workspaceSessionsTableName]: s.WorkspaceSessionsTable;
  [permissionsTableName]: s.PermissionsTable;
  [invitationsTableName]: s.InvitationsTable;
  [usersTableName]: s.UsersTable;
  [promptsTableName]: s.PromptsTable;
  [promptTypesTableName]: s.PromptTypesTable;
}

const dbPromise = (async () => {
  const url = process.env.POSTGRES_URL;
  console.log('Using database url: ', url);
  const db = await s.createDbInstance<Databases>();
  return db;
})();

export async function getDbInstance() {
  return await dbPromise;
}

export async function getHostSessions(
  columns: (keyof s.HostSessionsTable)[],
  page: number = 1,
  pageSize: number = 100,
): Promise<s.HostSession[]> {
  const db = await dbPromise;
  console.log('Calling getHostSessions');

  let query = db.selectFrom(hostTableName).select(columns);

  return query
    .orderBy('start_time', 'desc')
    .limit(pageSize)
    .offset(Math.max(0, page - 1) * pageSize)
    .execute();
}

export async function getHostSessionsForIds(
  ids: string[],
  columns: (keyof s.HostSessionsTable)[],
  page: number = 1,
  pageSize: number = 100,
): Promise<s.HostSession[]> {
  const db = await dbPromise;
  console.log('Database call to getHostSessions at:', new Date().toISOString());

  let query = db
    .selectFrom(hostTableName)
    .select(columns)
    .where('id', 'in', ids);

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
  console.log('Get Host Session Details for ID: ', sessionId);
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
      `${userTableName}.include_in_summary`,
      fn.count(`${messageTableName}.id`).as('message_count'),
    ])
    .groupBy([
      `${hostTableName}.id`,
      `${userTableName}.id`,
      `${userTableName}.active`,
      `${userTableName}.include_in_summary`,
    ])
    .execute();

  const stats: Record<
    string,
    Record<string, { num_messages: number; finished: boolean; includedInSummary: boolean }>
  > = {};

  for (const row of result) {
    if (!stats[row.sessionId]) {
      stats[row.sessionId] = {};
    }
    if (row.userId) {
      stats[row.sessionId][row.userId] = {
        num_messages: Number(row.message_count),
        finished: !row.active,
        includedInSummary: row.include_in_summary || false,
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
    // if (session?.assistant_id) {
    //   deleteAssistants([session.assistant_id]);
    // }
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

export async function getCustomResponsesByResourceIdAndType(
  sessionId: string,
  responseType: string = 'CUSTOM',
): Promise<s.CustomResponse[]> {
  try {
    const db = await dbPromise;
    const responses = await db
      .selectFrom(customResponsesTableName)
      .selectAll()
      .where('session_id', '=', sessionId)
      .where('response_type', '=', responseType)
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
  console.log('Creating new workspace: ', workspace);
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

export async function hasWorkspace(id: string): Promise<boolean> {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom('workspaces')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    return result !== undefined;
  } catch (error) {
    console.error('Error checking workspace existence:', error);
    return false;
  }
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

export async function getAllWorkspaces(): Promise<s.Workspace[]> {
  try {
    const db = await dbPromise;
    const result = await db.selectFrom('workspaces').selectAll().execute();

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

export async function getWorkspaceSessionIds(
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
export async function getPermissions(
  resourceId: string,
  resourceType?: 'SESSION' | 'WORKSPACE',
): Promise<{ user_id: string; role: Role }[]> {
  try {
    const db = await dbPromise;
    let query = db
      .selectFrom('permissions')
      .select(['user_id', 'role'])
      .where('resource_id', '=', resourceId);

    if (resourceType) {
      query = query.where('resource_type', '=', resourceType);
    }

    return await query.execute();
  } catch (error) {
    console.error('Error getting permissions:', error);
    return [];
  }
}

export async function setPermission(
  resourceId: string,
  role: Role,
  resourceType: 'SESSION' | 'WORKSPACE' = 'SESSION',
  userId?: string, // Defaults to whatever user is currently logged in
): Promise<boolean> {
  try {
    console.log(
      `Setting permissions: \nResources: ${resourceId}\nUser: ${userId}\nRole: ${role}\nResource Type: ${resourceType}`,
    );
    if (!userId) {
      const session = await authGetSession();
      userId = session?.user?.sub;
    }
    if (!userId) {
      console.warn('Could not get user info. Will store session as anonymous.');
    }
    const db = await dbPromise;
    await db
      .insertInto('permissions')
      .values({
        resource_id: resourceId,
        user_id: userId || 'anonymous',
        role,
        resource_type: resourceType,
      })
      .onConflict((oc) =>
        oc
          .columns(['resource_id', 'user_id', 'resource_type'])
          .doUpdateSet({ role }),
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
  resourceType?: 'SESSION' | 'WORKSPACE',
): Promise<{ role: Role } | null> {
  try {
    const db = await dbPromise;
    let query = db
      .selectFrom('permissions')
      .select('role')
      .where('resource_id', '=', resourceId)
      .where('user_id', '=', userId);

    if (resourceType) {
      query = query.where('resource_type', '=', resourceType);
    }

    const result = await query.executeTakeFirst();
    return result || null;
  } catch (error) {
    console.error('Error getting permission:', error);
    return null;
  }
}

export async function removePermission(
  resourceId: string,
  userId: string,
  resourceType?: 'SESSION' | 'WORKSPACE',
): Promise<boolean> {
  try {
    const db = await dbPromise;
    let query = db
      .deleteFrom('permissions')
      .where('resource_id', '=', resourceId)
      .where('user_id', '=', userId);

    if (resourceType) {
      query = query.where('resource_type', '=', resourceType);
    }

    await query.execute();

    return true;
  } catch (error) {
    console.error('Error removing permission:', error);
    return false;
  }
}

export async function canEdit(
  userId: string,
  resourceId: string,
  resourceType?: 'SESSION' | 'WORKSPACE',
): Promise<boolean> {
  const db = await dbPromise;
  let query = db
    .selectFrom('permissions')
    .select('role')
    .where('user_id', '=', userId)
    .where('resource_id', '=', resourceId);

  if (resourceType) {
    query = query.where('resource_type', '=', resourceType);
  }

  const permission = await query.executeTakeFirst();

  return (
    permission?.role === 'owner' ||
    permission?.role === 'editor' ||
    permission?.role === 'admin'
  );
}

export async function getResourcesForUser(
  userId: string,
  resourceType?: 'SESSION' | 'WORKSPACE',
  columns: (keyof s.Permission)[] = ['resource_id', 'resource_type', 'role'],
): Promise<s.Permission[]> {
  try {
    const db = await dbPromise;
    // Check for global permissions first
    const globalPermission = await db
      .selectFrom(permissionsTableName)
      .select('role')
      .where('user_id', '=', userId)
      .where('resource_id', '=', 'global')
      .executeTakeFirst();
    console.log('Global Permission: ', globalPermission);
    let query = db.selectFrom('permissions').select(columns);

    if (!globalPermission) {
      console.log('Getting resources, limiting to userId: ', userId);
      query = query.where('user_id', '=', userId);
    } else {
      console.log('Getting resources for admin');
    }

    if (resourceType) {
      query = query.where('resource_type', '=', resourceType);
    }
    return await query.execute();
  } catch (error) {
    console.error('Error getting resources for user:', error);
    return [];
  }
}

export async function updateVisibilitySettings(
  resourceId: string,
  settings: ResultTabsVisibilityConfig,
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

// Invitation Management Functions
export async function createInvitation(
  invitation: s.NewInvitation,
): Promise<s.Invitation | null> {
  try {
    const db = await dbPromise;
    const session = await authGetSession();
    const userSub = session?.user?.sub;

    const result = await db
      .insertInto(invitationsTableName)
      .values({
        ...invitation,
        created_by: userSub,
      })
      .returningAll()
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error creating invitation:', error);
    return null;
  }
}

export async function getInvitationsByEmail(
  email: string,
): Promise<s.Invitation[]> {
  try {
    const db = await dbPromise;
    const invitations = await db
      .selectFrom(invitationsTableName)
      .selectAll()
      .where('email', '=', email.toLowerCase())
      .where('accepted', '=', false)
      .execute();

    return invitations;
  } catch (error) {
    console.error('Error getting invitations by email:', error);
    return [];
  }
}

export async function getInvitationsByResource(
  resourceId: string,
  resourceType: 'SESSION' | 'WORKSPACE',
): Promise<s.Invitation[]> {
  try {
    const db = await dbPromise;
    const invitations = await db
      .selectFrom(invitationsTableName)
      .selectAll()
      .where('resource_id', '=', resourceId)
      .where('resource_type', '=', resourceType)
      .execute();

    return invitations;
  } catch (error) {
    console.error('Error getting invitations by resource:', error);
    return [];
  }
}

export async function markInvitationAsAccepted(
  invitationId: string,
): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db
      .updateTable(invitationsTableName)
      .set({ accepted: true })
      .where('id', '=', invitationId)
      .execute();

    return true;
  } catch (error) {
    console.error('Error marking invitation as accepted:', error);
    return false;
  }
}

export async function deleteInvitation(invitationId: string): Promise<boolean> {
  try {
    const db = await dbPromise;
    await db
      .deleteFrom(invitationsTableName)
      .where('id', '=', invitationId)
      .execute();

    return true;
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return false;
  }
}

export async function getWorkspacesForIds(
  workspaceIds: string[],
  columns: (keyof s.WorkspacesTable)[] = [],
): Promise<s.Workspace[]> {
  try {
    if (!workspaceIds.length) return [];

    const db = await dbPromise;
    let query = db.selectFrom('workspaces').where('id', 'in', workspaceIds);

    if (columns.length > 0) {
      return await query.select(columns).execute();
    } else {
      return await query.selectAll().execute();
    }
  } catch (error) {
    console.error('Error getting workspaces by IDs:', error);
    throw error;
  }
}

// User Management Functions

/**
 * Create or update a user profile based on Auth0 data
 */
export async function upsertUser(userData: s.NewUser): Promise<s.User | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .insertInto(usersTableName)
      .values(userData)
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
          last_login: sql`CURRENT_TIMESTAMP`,
          metadata: userData.metadata,
          subscription_status: userData.subscription_status,
          subscription_id: userData.subscription_id,
          subscription_period_end: userData.subscription_period_end,
          stripe_customer_id: userData.stripe_customer_id,
        }),
      )
      .returningAll()
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error upserting user:', error);
    return null;
  }
}

/**
 * Get a user by ID (Auth0 sub)
 */
export async function getUserById(id: string): Promise<s.User | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom(usersTableName)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<s.User | null> {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom(usersTableName)
      .selectAll()
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Get multiple users by their IDs
 */
export async function getUsersByIds(ids: string[]): Promise<s.User[]> {
  try {
    if (!ids.length) return [];

    const db = await dbPromise;
    const users = await db
      .selectFrom(usersTableName)
      .selectAll()
      .where('id', 'in', ids)
      .execute();

    return users;
  } catch (error) {
    console.error('Error getting users by IDs:', error);
    return [];
  }
}

type UserAndRole = s.User & { role: Role };

/**
 * Get users with permissions for a resource
 */
export async function getUsersWithPermissionsForResource(
  resourceId: string,
  resourceType?: 'SESSION' | 'WORKSPACE',
): Promise<Array<UserAndRole>> {
  try {
    const db = await dbPromise;
    let query = db
      .selectFrom(permissionsTableName)
      .innerJoin(
        usersTableName,
        `${usersTableName}.id`,
        `${permissionsTableName}.user_id`,
      )
      .where(`${permissionsTableName}.resource_id`, '=', resourceId)
      .select([
        `${usersTableName}.id`,
        `${usersTableName}.email`,
        `${usersTableName}.name`,
        `${usersTableName}.avatar_url`,
        `${permissionsTableName}.role`,
      ]);

    if (resourceType) {
      query = query.where(
        `${permissionsTableName}.resource_type`,
        '=',
        resourceType,
      );
    }

    return (await query.execute()) as UserAndRole[];
  } catch (error) {
    console.error('Error getting users with permissions:', error);
    return [];
  }
}

/**
 * Creates a link between a workspace and a session
 */
export async function createWorkspaceSessionLink(
  workspaceId: string,
  sessionId: string,
) {
  const db = await dbPromise;

  try {
    // Check if the link already exists to avoid duplicates
    const existingLink = await db
      .selectFrom(workspaceSessionsTableName)
      .select(['workspace_id', 'session_id'])
      .where('workspace_id', '=', workspaceId)
      .where('session_id', '=', sessionId)
      .executeTakeFirst();

    if (existingLink) {
      return existingLink; // Link already exists
    }

    // Create the new link
    return await db
      .insertInto(workspaceSessionsTableName)
      .values({
        workspace_id: workspaceId,
        session_id: sessionId,
      })
      .returningAll()
      .executeTakeFirst();
  } catch (error) {
    console.error('Error creating workspace-session link:', error);
    throw error;
  }
}

/**
 * Removes a link between a workspace and a session
 */
export async function removeWorkspaceSessionLink(
  workspaceId: string,
  sessionId: string,
): Promise<boolean> {
  const db = await dbPromise;

  try {
    // Delete the link from the workspace_sessions table
    const result = await db
      .deleteFrom(workspaceSessionsTableName)
      .where('workspace_id', '=', workspaceId)
      .where('session_id', '=', sessionId)
      .execute();

    // Check if any rows were affected by the delete operation
    return result.length > 0;
  } catch (error) {
    console.error('Error removing workspace-session link:', error);
    throw error;
  }
}

/**
 * Fetches all available sessions that could be linked to a workspace
 * (This would typically be sessions the user has access to)
 */
export async function getAvailableSessionsForUser(userId: string) {
  const db = await dbPromise;

  try {
    const query = db
      .selectFrom(hostTableName)
      .innerJoin(
        permissionsTableName,
        `${permissionsTableName}.resource_id`,
        `${hostTableName}.id`,
      )
      .where(`${permissionsTableName}.resource_type`, '=', 'SESSION')
      .where(`${permissionsTableName}.user_id`, '=', userId)
      .select([
        `${hostTableName}.id as id`,
        `${hostTableName}.topic as topic`,
        `${hostTableName}.start_time as start_time`,
      ]);

    return await query.execute();
  } catch (error) {
    console.error('Error fetching available sessions:', error);
    throw error;
  }
}

export type PromptWithType = s.Prompt & { type_name: string };

// Cached function to get active prompt by type with default fallback
export const getActivePromptByType = cache(
  async (typeId: string): Promise<PromptWithType | null> => {
    // First, try to find by direct ID match
    const db = await dbPromise;
    const rows = await db
      .selectFrom('prompts as p')
      .innerJoin('prompt_type as pt', 'p.prompt_type', 'pt.id')
      .select([
        'p.id',
        'p.prompt_type',
        'p.instructions',
        'p.active',
        'pt.name as type_name',
      ])
      .where((eb) =>
        eb.or([eb('p.prompt_type', '=', typeId), eb('pt.name', '=', typeId)]),
      )
      .where('p.active', '=', true)
      .limit(1)
      .execute();
    console.log(
      `[i] Retrieved prompt for type ${typeId}:`,
      rows[0] || 'Not found',
    );
    return (rows[0] as PromptWithType) || null;
  },
);

export async function getAllPrompts(): Promise<PromptWithType[]> {
  const db = await dbPromise;
  const rows = await db
    .selectFrom('prompts as p')
    .innerJoin('prompt_type as pt', 'p.prompt_type', 'pt.id')
    .select([
      'p.id',
      'p.prompt_type',
      'p.instructions',
      'p.active',
      'pt.name as type_name',
    ])
    .orderBy('p.created_at', 'desc')
    .execute();

  return rows as PromptWithType[];
}

export async function createDraftWorkspace(
  title: string = 'New Workspace',
): Promise<s.Workspace | null> {
  try {
    const db = await dbPromise;
    console.log('Creating draft workspace');

    // Create the draft workspace
    const result = await db
      .insertInto('workspaces')
      .values({
        title,
        description: '',
        is_public: false,
        status: 'draft',
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    if (result) {
      // Get current user for permissions
      const session = await authGetSession();
      const userSub = session?.user?.sub;

      if (!userSub) {
        console.warn('No user ID found when creating draft workspace');
        return result;
      }
      // Set owner permission for the user
      await setPermission(result.id, 'owner', 'WORKSPACE', userSub);
    }

    return result || null;
  } catch (error) {
    console.error('Error creating draft workspace:', error);
    return null;
  }
}

// This is supposed to be run on some intervals to clean up draft workspaces that were never finished.
// At this point there's no automatic invocation of this and should be done manually.
export async function cleanupDraftWorkspaces(
  olderThanHours: number = 30 * 24,
): Promise<number> {
  try {
    const db = await dbPromise;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await db
      .deleteFrom('workspaces')
      .where('status', '=', 'draft')
      .where('last_modified', '<', cutoffDate)
      .execute();

    return result.length;
  } catch (error) {
    console.error('Error cleaning up draft workspaces:', error);
    return 0;
  }
}

// Subscription Management Functions

/**
 * Update user's subscription details
 */
export async function updateUserSubscription(
  userId: string,
  data: {
    subscription_status: SubscriptionTier;
    subscription_id?: string;
    subscription_period_end?: Date;
    stripe_customer_id?: string;
  },
): Promise<void> {
  try {
    const db = await dbPromise;
    console.log('Updating user subscription:', { userId, data });

    const result = await db
      .updateTable(usersTableName)
      .set(data)
      .where('id', '=', userId)
      .returning(['subscription_status'])
      .execute();

    console.log('Update result:', result);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string) {
  try {
    const db = await dbPromise;
    const result = await db
      .selectFrom(usersTableName)
      .select([
        'subscription_status',
        'subscription_id',
        'subscription_period_end',
        'stripe_customer_id',
      ])
      .where('id', '=', userId)
      .executeTakeFirst();

    return result || null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

/**
 * Remove user's subscription (revert to FREE)
 */
export async function removeUserSubscription(userId: string): Promise<void> {
  try {
    const db = await dbPromise;
    await db
      .updateTable(usersTableName)
      .set({
        subscription_status: 'FREE',
        subscription_id: undefined,
        subscription_period_end: undefined,
      })
      .where('id', '=', userId)
      .execute();
  } catch (error) {
    console.error('Error removing user subscription:', error);
    throw error;
  }
}
