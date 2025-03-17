'use client';

import ResultTabs from '@/components/SessionResult/ResultTabs';
import WorkspaceHero from '@/components/workspace/WorkspaceHero';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';
import InviteUsers from '@/components/workspace/InviteUsers';
import { HostSession, ResultTabsVisibilityConfig, UserSession, Workspace } from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { createNewWorkspace } from './actions';
import { useEffect, useState } from 'react';

// Default visibility configuration for workspaces
const defaultWorkspaceVisibilityConfig: ResultTabsVisibilityConfig = {
  showSummary: true,
  showParticipants: true,
  showCustomInsights: true,
  showChat: true,
  showSimScore: true,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

interface WorkspaceContentProps {
  exists: boolean;
  workspaceData?: Workspace;
  hostSessions: HostSession[];
  userData: UserSession[];
  sessionIds: string[];
  workspaceId: string;
  isPublicAccess?: boolean;
}

export default function WorkspaceContent({
  exists,
  workspaceData: initialWorkspaceData,
  hostSessions,
  userData,
  sessionIds,
  workspaceId,
  isPublicAccess,
}: WorkspaceContentProps) {

  const [workspaceData, setWorkspaceData] = useState<Workspace>(initialWorkspaceData);

  // Update state when initialWorkspaceData changes (e.g., after fetch)
  useEffect(() => {
    if (initialWorkspaceData) {
      setWorkspaceData(initialWorkspaceData);
    }
  }, [initialWorkspaceData]);

  // Function to handle updates from child components
  const handleWorkspaceUpdate = (updates: Partial<typeof workspaceData>) => {
    setWorkspaceData(prev => ({
      ...prev,
      ...updates
    }));
  };

  // For public access, we show a more limited view
  const visibilityConfig = isPublicAccess
      ? {
          showSummary: true,
          showParticipants: false,
          showCustomInsights: true,
          showChat: true,
          allowCustomInsightsEditing: false,
          showSessionRecap: true,
        }
      : defaultWorkspaceVisibilityConfig;
  
  const { hasMinimumRole, loading: loadingUserInfo } = usePermissions(workspaceId);

  const submitNewWorkspace = async () => {
    if (workspaceData) {
      if (workspaceId) {
        workspaceData.id = workspaceId; // If this is enabled we can navigate to arbitrary pages to create new ids (instead of using random ids);
      }
      await createNewWorkspace(workspaceData)
    }
  }

  return (
    <>
      <div className="flex w-full flex-col">
        <WorkspaceHero
          workspaceId={workspaceId}
          exists={exists}
          title={workspaceData?.title}
          description={workspaceData?.description}
          location={workspaceData?.location}
          isEditable={!exists || (!loadingUserInfo && hasMinimumRole('owner'))}
        />
        {!loadingUserInfo && hasMinimumRole('owner') && (
          <div className="flex gap-2 self-end mt-4">
            <InviteUsers workspaceId={workspaceId} />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-4">
        <ResultTabs
          hostData={hostSessions}
          userData={userData}
          resourceId={workspaceId}
          isWorkspace={true}
          hasNewMessages={false}
          visibilityConfig={
            workspaceData?.visibility_settings || visibilityConfig
          }
          sessionIds={exists ? sessionIds : ['placeholder-session-1', 'placeholder-session-2']}
          chatEntryMessage={{
            role: 'assistant',
            content: `Bienvenue au Sommet IA de l'ENS-PSL! Je suis là pour vous aider à comprendre les enseignements des discussions précédentes.

Voici quelques questions que vous pourriez poser :
  - Quels ont été les thèmes principaux abordés lors des sessions ?
  - Comment les participants ont-ils perçu le rôle de l'IA dans l'éducation ?
  - Quelles étaient les principales préoccupations concernant l'adoption de l'IA ?
  
You can also ask me in any other language, and I will try my best to reply in your language. (However, I might not always get that right 😅)`,
          }}
          showEdit={!loadingUserInfo && hasMinimumRole('owner')}
          isNewWorkspace={!exists}
        />
      </div>

      <SessionInsightsGrid
        hostSessions={hostSessions}
        userData={userData}
        workspaceId={workspaceId}
        isPublicAccess={isPublicAccess}
        showEdit={!exists || (!loadingUserInfo && hasMinimumRole('owner'))}
      />
      {!exists && (
        <Button className="mt-4" onClick={submitNewWorkspace}>Save Workspace</Button>
      )}
    </>
  );
}
