'use server';

import { getSession } from '@auth0/nextjs-auth0'
import { getDbInstance } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// These should match the table names in the Databases interface
const usersTable = 'users';
const chatSessionsTable = 'user_db';
const messageTable = 'messages_db';
const workspaceSessionsTable = 'workspace_sessions';
const permissionsTable = 'permissions';
const hostSessionsTable = 'host_db';
const workspacesTable = 'workspaces';
const apiKeysTable = 'api_keys';
const sessionRatingsTable = 'session_ratings';

export async function fetchUserData() {
  const session = await getSession();
  
  if (!session || !session.user?.sub) {
    throw new Error('Unauthorized');
  }

  console.log('Current user: ', session.user);
  
  try {
    const db = await getDbInstance();
    const userSub = session.user.sub;
    
    // Get user information
    const user = await db
      .selectFrom(usersTable)
      .selectAll()
      .where('id', '=', userSub)
      .executeTakeFirst();
      
    // Fetch user's permissions
    const permissions = await db
      .selectFrom(permissionsTable)
      .selectAll()
      .where('user_id', '=', userSub)
      .execute();
    
    // Extract resource IDs where user is owner
    const ownedSessionIds = permissions
      .filter(p => p.resource_type === 'SESSION' && p.role === 'owner')
      .map(p => p.resource_id);
      
    const ownedWorkspaceIds = permissions
      .filter(p => p.resource_type === 'WORKSPACE' && p.role === 'owner')
      .map(p => p.resource_id);
    
    // Fetch user sessions
    const userSessions = await db
      .selectFrom(chatSessionsTable)
      .selectAll()
      .where('user_id', '=', userSub)
      .execute();
      
    // Get all thread IDs from user sessions
    const threadIds = userSessions.map(session => session.thread_id);
    
    // Fetch user messages
    const messages = await db
      .selectFrom(messageTable)
      .selectAll()
      .where('thread_id', 'in', threadIds.length > 0 ? threadIds : [''])
      .execute();
      
    // Fetch workspace sessions for owned workspaces
    const workspaceSessions = await db
      .selectFrom(workspaceSessionsTable)
      .selectAll()
      .where(eb => 
        eb.or([
          eb('workspace_id', 'in', ownedWorkspaceIds.length > 0 ? ownedWorkspaceIds : ['']),
          eb('session_id', 'in', ownedSessionIds.length > 0 ? ownedSessionIds : [''])
        ])
      )
      .execute();
    
    // Fetch host sessions owned by user
    const hostSessions = await db
      .selectFrom(hostSessionsTable)
      .selectAll()
      .where('id', 'in', ownedSessionIds.length > 0 ? ownedSessionIds : [''])
      .execute();
      
    // Fetch workspaces owned by user
    const workspaces = await db
      .selectFrom(workspacesTable)
      .selectAll()
      .where('id', 'in', ownedWorkspaceIds.length > 0 ? ownedWorkspaceIds : [''])
      .execute();
    
    return {
      user,
      permissions,
      sessions: userSessions,
      messages,
      workspaceSessions,
      hostSessions,
      workspaces,
      // Include these ID collections for reference
      ownedSessionIds,
      ownedWorkspaceIds,
      threadIds
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw new Error('Failed to fetch user data');
  }
}

export async function updateUserName(name: string) {
  const session = await getSession();
  if (!session || !session.user?.sub) {
    return { success: false, message: 'Unauthorized' };
  }

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) {
    return { success: false, message: 'Name must be between 1 and 255 characters' };
  }

  try {
    const db = await getDbInstance();
    await db
      .updateTable(usersTable)
      .set({ name: trimmed })
      .where('id', '=', session.user.sub)
      .execute();

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating user name:', error);
    return { success: false, message: 'Failed to update name' };
  }
}

export async function requestPasswordReset() {
  const session = await getSession();
  if (!session || !session.user?.sub || !session.user?.email) {
    return { success: false, message: 'Unauthorized' };
  }

  // Auth0 social login users (Google, GitHub) can't change passwords
  if (!session.user.sub.startsWith('auth0|')) {
    return { success: false, message: 'Password change is not available for social login accounts.' };
  }

  try {
    const response = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/dbconnections/change_password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.AUTH0_CLIENT_ID,
          email: session.user.email,
          connection: 'Username-Password-Authentication',
        }),
      },
    );

    if (!response.ok) {
      console.error('Auth0 password reset failed:', await response.text());
      return { success: false, message: 'Failed to send password reset email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { success: false, message: 'Failed to send password reset email' };
  }
}

export async function deleteUserData(existingUserData?: any) {
  const session = await getSession();
  
  if (!session || !session.user?.sub) {
    return { success: false, message: 'Unauthorized' };
  }
  
  try {
    // Use existing user data if provided, otherwise fetch it
    const userData = existingUserData || await fetchUserData();
    const userSub = session.user.sub;
    
    console.log('Deleting user data for:', userSub);
    console.log('Data to be deleted:');
    console.log(`- ${userData.messages.length} messages`);
    console.log(`- ${userData.sessions.length} user sessions`);
    console.log(`- ${userData.workspaceSessions.length} workspace sessions`);
    console.log(`- ${userData.hostSessions.length} host sessions`);
    console.log(`- ${userData.workspaces.length} workspaces`);
    console.log(`- ${userData.permissions.length} permissions`);
    
    const db = await getDbInstance();
    
    console.log('Starting data deletion...');
    
    // 1. Delete messages by exact IDs
    if (userData.messages.length > 0) {
      const messageIds = userData.messages.map((msg: any) => msg.id);
      console.log(`Deleting ${messageIds.length} specific messages`);
      await db
        .deleteFrom(messageTable)
        .where('id', 'in', messageIds)
        .execute();
    }
    
    // 2. Delete user sessions by exact IDs
    if (userData.sessions.length > 0) {
      const sessionIds = userData.sessions.map((session: any) => session.id);
      console.log(`Deleting ${sessionIds.length} specific chat sessions`);
      await db
        .deleteFrom(chatSessionsTable)
        .where('id', 'in', sessionIds)
        .execute();
    }  
    
    // 3. For owned resources, check if user is the sole owner before deletion
    
    // 3a. Process host sessions (for owned sessions)
    for (const hostSession of userData.hostSessions) {
      // Check if this user is the sole owner
      const otherOwners = await db
        .selectFrom(permissionsTable)
        .select('user_id')
        .where('resource_id', '=', hostSession.id)
        .where('resource_type', '=', 'SESSION')
        .where('role', '=', 'owner')
        .where('user_id', '!=', userSub)
        .execute();
      
      if (otherOwners.length === 0) {
        // User is sole owner, delete the host session
        console.log(`Deleting host session ${hostSession.id} (user is sole owner)`);
        await db
          .deleteFrom(hostSessionsTable)
          .where('id', '=', hostSession.id)
          .execute();
      } else {
        console.log(`Not deleting host session ${hostSession.id} (has other owners: ${otherOwners.length})`);
      }
    }
    
    // 3b. Process workspaces (for owned workspaces)
    for (const workspace of userData.workspaces) {
      // Check if this user is the sole owner
      const otherOwners = await db
        .selectFrom(permissionsTable)
        .select('user_id')
        .where('resource_id', '=', workspace.id)
        .where('resource_type', '=', 'WORKSPACE')
        .where('role', '=', 'owner')
        .where('user_id', '!=', userSub)
        .execute();
      
      if (otherOwners.length === 0) {
        // User is sole owner, delete the workspace
        console.log(`Deleting workspace ${workspace.id} (user is sole owner)`);
        await db
          .deleteFrom(workspacesTable)
          .where('id', '=', workspace.id)
          .execute();
        
        // Also make sure that we delete all workspace_session rows for this workspace.
        // For workspace_sessions, we need to construct a composite key condition
        if (userData.workspaceSessions.length > 0) {            
          console.log(`Deleting ${userData.workspaceSessions.length} specific workspace sessions`);
          for (const ws of userData.workspaceSessions) {
            await db
              .deleteFrom(workspaceSessionsTable)
              .where('workspace_id', '=', ws.workspace_id)
              .where('session_id', '=', ws.session_id)
              .execute();
          }
        }
      } else {
        console.log(`Not deleting workspace ${workspace.id} (has other owners: ${otherOwners.length})`);
      }
    }
    
    // 4. Delete permissions for this user
    console.log(`Deleting all permissions for user ${userSub}`);
    await db
      .deleteFrom(permissionsTable)
      .where('user_id', '=', userSub)
      .execute();
    
    console.log('Data deletion completed successfully');
    
    // Revalidate the settings page to reflect the changes
    revalidatePath('/settings');
    
    return { 
      success: true, 
      message: 'All user data has been deleted',
      deletedCounts: {
        messages: userData.messages.length,
        sessions: userData.sessions.length,
        workspaceSessions: userData.workspaceSessions.length,
        hostSessions: userData.hostSessions.length,
        workspaces: userData.workspaces.length,
        permissions: userData.permissions.length
      }
    };
  } catch (error) {
    console.error('Error deleting user data:', error);
    return { success: false, message: 'Failed to delete user data' };
  }
}

export async function fetchHarmonicaMd(): Promise<string | null> {
  const session = await getSession();
  if (!session?.user?.sub) return null;

  try {
    const db = await getDbInstance();
    const result = await db
      .selectFrom(usersTable)
      .select('harmonica_md')
      .where('id', '=', session.user.sub)
      .executeTakeFirst();
    return result?.harmonica_md || null;
  } catch (error) {
    console.error('Error fetching HARMONICA.md:', error);
    return null;
  }
}

export async function saveHarmonicaMd(content: string) {
  const session = await getSession();
  if (!session?.user?.sub) {
    return { success: false, message: 'Unauthorized' };
  }

  const trimmed = content.trim();
  if (trimmed.length > 6000) {
    return { success: false, message: 'Content exceeds 6000 character limit' };
  }

  try {
    const db = await getDbInstance();
    await db
      .updateTable(usersTable)
      .set({ harmonica_md: trimmed || null })
      .where('id', '=', session.user.sub)
      .execute();

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error saving HARMONICA.md:', error);
    return { success: false, message: 'Failed to save' };
  }
}

export async function deleteUserAccount(existingUserData?: any) {
  const session = await getSession();
  
  if (!session || !session.user?.sub) {
    return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const db = await getDbInstance();
    const userSub = session.user.sub;
    
    // First delete all user data using the existing function
    // Pass the existing user data to avoid redundant fetching
    const dataDeleteResult = await deleteUserData(existingUserData);
    
    if (!dataDeleteResult.success) {
      return { success: false, message: 'Failed to delete user data before account deletion' };
    }
    
    // Then delete the user account itself
    
    // Delete any remaining permissions
    await db
      .deleteFrom(permissionsTable)
      .where('user_id', '=', userSub)
      .execute();
    
    // Delete any invitations created by this user
    await db
      .deleteFrom('invitations')
      .where('created_by', '=', userSub)
      .execute();

    // Delete API keys
    await db
      .deleteFrom(apiKeysTable)
      .where('user_id', '=', userSub)
      .execute();

    // Delete session ratings
    await db
      .deleteFrom(sessionRatingsTable)
      .where('user_id', '=', userSub)
      .execute();

    // Finally delete the user record
    await db
      .deleteFrom(usersTable)
      .where('id', '=', userSub)
      .execute();
    
    // Note: This doesn't actually log the user out or delete their Auth0 account
    // That would require additional Auth0 API calls which are not implemented here
    
    return { 
      success: true, 
      message: 'User account has been deleted. You will be logged out shortly.' 
    };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return { success: false, message: 'Failed to delete user account' };
  }
}
