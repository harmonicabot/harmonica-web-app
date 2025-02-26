import * as db from '@/lib/db';
import { WorkspaceData } from '@/lib/types';

export async function fetchWorkspaceData(workspaceId: string): Promise<WorkspaceData> {
  try {
    const workspaceData = await db.getWorkspaceById(workspaceId);
    
    // If workspace doesn't exist, return empty data structure
    if (!workspaceData) {
      return {
        exists: false,
        hostSessions: [],
        userData: [],
        sessionIds: []
      };
    }

    // Fetch all necessary data for existing workspace
    const sessionIds = await db.getWorkspaceSessions(workspaceId);
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
      workspaceData,
      hostSessions,
      userData,
      sessionIds
    };
  } catch (error) {
    console.error(`Error occurred fetching workspace data: `, error);
    throw error; // Re-throw to let the component handle it
  }
}
