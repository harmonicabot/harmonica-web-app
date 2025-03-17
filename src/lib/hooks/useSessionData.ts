import * as db from '@/lib/db';
import { HostSession, UserSession } from '@/lib/schema';
import { getUserStats } from '@/lib/clientUtils';
import { ResultTabsVisibilityConfig } from '@/lib/schema';

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
  isPublicAccess?: boolean;
}

export async function fetchSessionData(
  sessionId: string,
  workspaceId?: string,
  isPublicAccess?: boolean
): Promise<SessionData> {
  try {
    // Fetch host session data
    const hostData = await db.getHostSessionById(sessionId);

    // Check public access permissions
    if (isPublicAccess && !hostData.is_public) {
      if (workspaceId) {
        const workspaceData = await db.getWorkspaceById(workspaceId);
        if (!workspaceData || !workspaceData.is_public) {
          throw new Error('This session is not publicly accessible.');
        }
      } else {
        throw new Error('This session is not publicly accessible.');
      }
    }

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