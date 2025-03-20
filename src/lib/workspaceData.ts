import * as db from '@/lib/db';
import { ExtendedWorkspaceData } from '@/lib/types';
import { getSession } from '@auth0/nextjs-auth0';

export async function fetchWorkspaceData(workspaceId: string): Promise<ExtendedWorkspaceData> {
  try {
    const workspaceData = await db.getWorkspaceById(workspaceId);
    
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

    // If workspace doesn't exist, return empty data structure
    if (!workspaceData) {
      console.log(`Workspace ${workspaceId} not found, seems this is a new one!`);
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
      exists: true,
      workspace: workspaceData,
      hostSessions,
      userData,
      sessionIds,
      availableSessions,
    };
  } catch (error) {
    console.error(`Error occurred fetching workspace data: `, error);
    throw error; // Re-throw to let the component handle it
  }
}
