import * as db from '@/lib/db';
import { HostSession, UserSession } from '@/lib/schema';
import { getUserStats } from '@/lib/clientUtils';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { hasAccessToResource } from '@/lib/serverUtils';

export interface SessionData {
  hostData: HostSession;
  userData: UserSession[];
  stats: {
    totalUsers: number;
    finishedUsers: number;
  };
  usersWithChat: UserSession[];
  visibilitySettings?: ResultTabsVisibilityConfig;
}

export interface UseSessionDataProps {
  sessionId: string;
  workspaceId?: string;
}

export async function fetchSessionData(
  sessionId: string,
  workspaceId?: string,
): Promise<SessionData> {
  try {
    // Check if user has permission to access this session
    const hasAccess = await hasAccessToResource(sessionId);
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to view this session');
    }

    // Fetch host session data
    const hostData = await db.getHostSessionById(sessionId);

    // Fetch user data and stats
    const [userData, messageStats] = await Promise.all([
      db.getUsersBySessionId(sessionId),
      db.getNumUsersAndMessages([hostData.id])
    ]);

    // Filter users with sufficient chat messages
    const usersWithChat = userData.filter(
      (user) => messageStats[sessionId][user.id].num_messages > 2
    );

    // Calculate user stats
    const { totalUsers, finishedUsers } = getUserStats(messageStats, sessionId);

    // Get visibility settings from the appropriate source
    let visibilitySettings: ResultTabsVisibilityConfig | undefined;
    if (workspaceId) {
      const workspaceData = await db.getWorkspaceById(workspaceId);
      visibilitySettings = workspaceData?.visibility_settings;
    } else {
      visibilitySettings = hostData.visibility_settings;
    }

    return {
      hostData,
      userData,
      stats: {
        totalUsers,
        finishedUsers
      },
      usersWithChat,
      visibilitySettings
    };
  } catch (error) {
    console.error('Error fetching session data:', error);
    throw error;
  }
} 