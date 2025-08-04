import * as db from '@/lib/db';
import { ExtendedWorkspaceData } from '@/lib/types';
import { getSession } from '@auth0/nextjs-auth0';
import { NewWorkspace, HostSession, UserSession } from './schema';
import { hasAccessToResource } from './serverUtils';
import { QueryClient } from '@tanstack/react-query';


async function getAllAvailableSessionIds() {
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
  return availableSessions;
}

export async function fetchWorkspaceData(
  workspaceId: string, 
  queryClient?: QueryClient
): Promise<ExtendedWorkspaceData> {
  try {
    console.log("Fetching project data for workspace ", workspaceId);
    
    // First, check whether this workspace exists at all. If not, add a 'draft' mode with the current user as the owner:
    const workspaceExists = await db.hasWorkspace(workspaceId);
    if (!workspaceExists) {
      const draftWorkspace: NewWorkspace = {
        id: workspaceId,
        title: "New Project",
        status: 'draft',
        gradientFrom: '#6B21A8',
        gradientTo: '#9333EA',
        useGradient: true,
      };
      
      await db.createWorkspace(draftWorkspace);
      await db.setPermission(workspaceId, 'owner', 'WORKSPACE');
      const availableSessions = await getAllAvailableSessionIds();
      return {
        exists: false,
        workspace: draftWorkspace,
        hostSessions: [],
        userData: [],
        sessionIds: [],
        availableSessions
      };
    }

    // Check if user has access to this workspace
    const hasAccess = await hasAccessToResource(workspaceId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to view this Project');
    }

    let workspaceData = await db.getWorkspaceById(workspaceId);
    if (!workspaceData) {
      throw new Error('Project not found'); // This should never happen; but in order to make typescript happy...
    }
    if (workspaceData.status == 'deleted') {
      // The workspace was marked for deletion, but hasn't actually been deleted. Let's do that now.
      await db.deleteWorkspace(workspaceId);
      console.log("Deleting ", workspaceId);
      throw new Error('Project has been removed.');
    }
    
    const availableSessions = await getAllAvailableSessionIds();

    console.log(`Found Project ${workspaceId}!`);
    // Fetch all necessary data for existing workspace
    const sessionIds = await db.getWorkspaceSessionIds(workspaceId);
    
    let hostSessions: HostSession[];
    let allUserData: UserSession[][];
    
    // Try to get from cache first if queryClient is provided
    if (queryClient) {
      console.log("Attempting to use cached session data...");
      const cachedHosts = sessionIds.map(id => 
        queryClient.getQueryData<HostSession>(['host', id])
      );
      const cachedUsers = sessionIds.map(id => 
        queryClient.getQueryData<UserSession[]>(['users', id])
      );
      
      // Use cached data if all sessions are cached
      if (cachedHosts.every(h => h) && cachedUsers.every(u => u)) {
        console.log("Using cached session data for performance optimization");
        hostSessions = cachedHosts as HostSession[];
        allUserData = cachedUsers as UserSession[][];
      } else {
        console.log("Cache miss - falling back to database queries");
        // Fallback to database if cache miss
        [hostSessions, allUserData] = await Promise.all([
          Promise.all(sessionIds.map((id) => db.getHostSessionById(id))),
          Promise.all(sessionIds.map((id) => db.getUsersBySessionId(id))),
        ]);
      }
    } else {
      // No queryClient provided, use database directly
      [hostSessions, allUserData] = await Promise.all([
        Promise.all(sessionIds.map((id) => db.getHostSessionById(id))),
        Promise.all(sessionIds.map((id) => db.getUsersBySessionId(id))),
      ]);
    }

    hostSessions.sort((a, b) => a.topic.localeCompare(b.topic));

    const stats = await db.getNumUsersAndMessages(
      hostSessions.map((session) => session.id),
    );
    
    const usersWithChat = allUserData.map((sessionUsers) =>
      sessionUsers.filter(
        (user) =>
          stats[user.session_id][user.id].num_messages > 2
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
    console.error(`Error occurred fetching optimized Project data: `, error);
    // Check if this is an access denied error
    if (error instanceof Error && error.message.includes('Access denied')) {
      throw new Error('Access denied: You do not have permission to view this Project');
    }
    throw error; // Re-throw to let the component handle it
  }
}
