'use client';

import ResultTabs from '@/components/SessionResult/ResultTabs';
import WorkspaceHero from '@/components/workspace/WorkspaceHero';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';
import InviteUsers from '@/components/workspace/InviteUsers';
import { VisibilitySettings } from '@/components/SessionResult/ResultTabs/components/VisibilitySettings';
import { ResultTabsVisibilityConfig } from '@/lib/types';
import { HostSession, UserSession } from '@/lib/schema';
import { useState } from 'react';
import { usePermissions } from '@/lib/permissions';

// Default visibility configuration for workspaces
const defaultWorkspaceVisibilityConfig: ResultTabsVisibilityConfig = {
  showSummary: true,
  showParticipants: true,
  showCustomInsights: true,
  showChat: true,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

interface WorkspaceContentProps {
  exists: boolean;
  workspaceData?: {
    id: string;
    title?: string;
    description?: string;
    location?: string;
    is_public?: boolean;
    visibility_settings?: ResultTabsVisibilityConfig;
  };
  hostSessions: HostSession[];
  userData: UserSession[];
  sessionIds: string[];
  workspaceId: string;
  isPublicAccess?: boolean;
}

export default function WorkspaceContent({
  exists,
  workspaceData,
  hostSessions,
  userData,
  sessionIds,
  workspaceId,
  isPublicAccess,
}: WorkspaceContentProps) {
  // For public access, we show a more limited view
  const [visibilityConfig, setVisibilityConfig] = useState(
    isPublicAccess
      ? {
          showSummary: true,
          showParticipants: false,
          showCustomInsights: true,
          showChat: true,
          allowCustomInsightsEditing: false,
          showSessionRecap: true,
        }
      : defaultWorkspaceVisibilityConfig
  );

  // Save visibility settings when they change
  const handleVisibilityChange = async (
    newConfig: ResultTabsVisibilityConfig
  ) => {
    console.log("Updating vidibility config: ", newConfig)
    setVisibilityConfig(newConfig);
    try {
      // await db.updateVisibilitySettings(workspaceId, newConfig);
    } catch (error) {
      console.error('Failed to save visibility settings:', error);
    }
  };

  return (
    <>
      <div className="flex w-full flex-col">
        <WorkspaceHero
          workspaceId={workspaceId}
          exists={exists}
          title={workspaceData?.title}
          description={workspaceData?.description}
          location={workspaceData?.location}
          isEditable={true} // TODO: Check user permissions
        />
        <div className="flex gap-2 self-end mt-4">
          <InviteUsers workspaceId={workspaceId} />
          <VisibilitySettings
            config={workspaceData?.visibility_settings || visibilityConfig}
            onChange={handleVisibilityChange}
            isWorkspace={true}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-4">
        <ResultTabs
          hostData={hostSessions}
          userData={userData}
          id={workspaceId}
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
          showEdit={!exists} // Show edit button when workspace doesn't exist
        />
      </div>

      <SessionInsightsGrid
        hostSessions={hostSessions}
        userData={userData}
        workspaceId={workspaceId}
        isPublicAccess={isPublicAccess}
        showEdit={!exists} // Show edit button when workspace doesn't exist
      />
    </>
  );
}
