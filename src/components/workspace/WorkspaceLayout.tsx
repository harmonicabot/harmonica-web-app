import * as db from '@/lib/db';
import ErrorPage from '@/components/Error';
import { ReactNode } from 'react';
import { HostSession, UserSession } from '@/lib/schema';
import { ResultTabsVisibilityConfig } from '@/lib/types';

interface WorkspaceData {
  exists: boolean;
  workspaceData?: {
    id: string;
    title?: string;
    description?: string;
    location?: string;
    is_public?: boolean;
    visibility_settings?: ResultTabsVisibilityConfig;
    // Add other workspace fields as needed
  };
  hostSessions: HostSession[];
  userData: UserSession[];
  sessionIds: string[];
}

interface WorkspaceLayoutProps {
  workspaceId: string;
  isPublicAccess?: boolean;
  children: (data: WorkspaceData) => ReactNode;
}

export default async function WorkspaceLayout({
  workspaceId,
  isPublicAccess,
  children
}: WorkspaceLayoutProps) {
  try {
    // Fetch workspace data
    const workspaceData = await db.getWorkspaceById(workspaceId);
    
    // If public access is requested but workspace isn't public, show error
    if (isPublicAccess && workspaceData?.is_public === false) {
      return (
        <ErrorPage
          title="Access Denied"
          message="This workspace is not publicly accessible."
        />
      );
    }

    // If workspace doesn't exist, return empty data structure
    if (!workspaceData) {
      return (
        <div className="p-4 md:p-8">
          {children({
            exists: false,
            hostSessions: [],
            userData: [],
            sessionIds: []
          })}
        </div>
      );
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

    return (
      <div className="p-4 md:p-8">
        {children({
          exists: true,
          workspaceData,
          hostSessions,
          userData,
          sessionIds
        })}
      </div>
    );
  } catch (error) {
    console.error(`Error occurred fetching data: `, error);
    return (
      <ErrorPage
        title={'Error loading workspace'}
        message={'The workspace could not be loaded.'}
      />
    );
  }
} 