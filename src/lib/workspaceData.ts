import * as db from '@/lib/db';
import { ExtendedWorkspaceData } from '@/lib/types';
import { getSession } from '@auth0/nextjs-auth0';
import { NewWorkspace } from './schema';
import { hasWorkspaceAccess } from './serverUtils';

export async function fetchWorkspaceData(workspaceId: string): Promise<ExtendedWorkspaceData> {
  try {
    // Check if user has access to this workspace
    const hasAccess = await hasWorkspaceAccess(workspaceId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to view this workspace');
    }

    let workspaceData = await db.getWorkspaceById(workspaceId);
    
    // Fetch available sessions for linking if the user is logged in
    const session = await getSession();
    const userId = session?.user?.sub;    
    const availableResources = await db.getResourcesForUser(userId, "SESSION", ["resource_id"]);
    const availableSessionsIds = availableResources.map((r) => r.resource_id).filter((id) => id !== 'global');
    let availableSessions: ExtendedWorkspaceData["availableSessions"] = [];
    if (availableSessionsIds.length > 0) {
      availableSessions = await db.getHostSessionsForIds(availableSessionsIds, [
        'id',
        'topic',
        'start_time'
      ]);
    }

    // If workspace doesn't exist, create it.
    if (!workspaceData) {
      const draftWorkspace: NewWorkspace = {
        id: workspaceId,
        title: "New Workspace",
        status: 'draft',
      }
      workspaceData = await db.createWorkspace(draftWorkspace);

      return {
        exists: false,
        hostSessions: [],
        userData: [],
        sessionIds: [],
        availableSessions
      };
    }

    console.log(`Found workspace ${workspaceId}!`);
    // Fetch all necessary data for existing workspace
    const sessionIds = await db.getWorkspaceSessionIds(workspaceId);
    const [hostSessions, allUserData] = await Promise.all([
      Promise.all(sessionIds.map((id) => db.getHostSessionById(id))),
      Promise.all(sessionIds.map((id) => db.getUsersBySessionId(id))),
    ]);

    hostSessions.sort((a, b) => a.topic.localeCompare(b.topic));

    const stats = await db.getNumUsersAndMessages(
      hostSessions.map((session) => session.id),
    );
    
    const usersWithChat = allUserData.map((sessionUsers) =>
      sessionUsers.filter(
        (user) =>
          stats[user.session_id][user.id].num_messages > 2 &&
          user.include_in_summary,
      ),
    );

    const userData = usersWithChat.flat();

    return {
      exists: workspaceData.status !== 'draft',
      workspace: workspaceData,
      hostSessions,
      userData,
      sessionIds,
      availableSessions,
    };
  } catch (error) {
    console.error(`Error occurred fetching workspace data: `, error);
    // Check if this is an access denied error
    if (error instanceof Error && error.message.includes('Access denied')) {
      throw new Error('Access denied: You do not have permission to view this workspace');
    }
    throw error; // Re-throw to let the component handle it
  }
}
