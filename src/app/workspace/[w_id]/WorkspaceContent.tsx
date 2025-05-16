'use client';

import ResultTabs from '@/components/SessionResult/ResultTabs';
import WorkspaceHero from '@/components/workspace/WorkspaceHero';
import ShareSettings from '@/components/ShareSettings';
import {
  NewWorkspace,
  ResultTabsVisibilityConfig,
  Workspace,
} from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import { useEffect, useState } from 'react';
import { ExtendedWorkspaceData } from '@/lib/types';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';

// Default visibility configuration for workspaces
const defaultWorkspaceVisibilityConfig: ResultTabsVisibilityConfig = {
  showSummary: true,
  showResponses: true,
  showCustomInsights: false,
  showChat: true,
  showSimScore: false,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

interface WorkspaceContentProps {
  extendedWorkspaceData: ExtendedWorkspaceData;
  workspaceId: string;
}

export default function WorkspaceContent({
  extendedWorkspaceData,
  workspaceId,
}: WorkspaceContentProps) {
  const initialWorkspaceData = extendedWorkspaceData?.workspace;
  const [workspaceData, setWorkspaceData] = useState<Workspace | NewWorkspace>(
    initialWorkspaceData
  );

  // Update state when initialWorkspaceData changes (e.g., after fetch)
  useEffect(() => {
    if (initialWorkspaceData) {
      setWorkspaceData(initialWorkspaceData);
    }
  }, [initialWorkspaceData]);

  // Function to handle updates from child components
  const handleWorkspaceUpdate = (updates: Workspace) => {
    setWorkspaceData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const { hasMinimumRole, loading: loadingUserInfo, isPublic } =
    usePermissions(workspaceId);

  // For public access, we show a more limited view
  const visibilityConfig: ResultTabsVisibilityConfig = isPublic
    ? {
        showSummary: true,
        showResponses: false,
        showCustomInsights: false,
        showSimScore: false,
        showChat: true,
        allowCustomInsightsEditing: false,
        showSessionRecap: true,
      }
    : defaultWorkspaceVisibilityConfig;

  const exists = extendedWorkspaceData.exists;

  return (
    <>
      <div className="flex w-full flex-col">
        <WorkspaceHero
          workspaceId={workspaceId}
          exists={exists}
          title={workspaceData?.title}
          description={workspaceData?.description}
          location={workspaceData?.location}
          bannerImageUrl={workspaceData?.bannerImage}
          initialGradientFrom={workspaceData?.gradientFrom}
          initialGradientTo={workspaceData?.gradientTo}
          initialUseGradient={workspaceData?.useGradient}
          isEditable={!exists || (!loadingUserInfo && hasMinimumRole('editor'))}
          onUpdate={handleWorkspaceUpdate}
        />
        {!loadingUserInfo && hasMinimumRole('editor') && (
          <div className="flex items-center gap-4 self-end mt-4">
            <ShareSettings 
              resourceId={workspaceId} 
              resourceType="WORKSPACE" 
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-4">
        <ResultTabs
          hostData={extendedWorkspaceData.hostSessions}
          userData={extendedWorkspaceData.userData}
          resourceId={workspaceId}
          isWorkspace={true}
          hasNewMessages={false}
          visibilityConfig={
            workspaceData?.visibility_settings || visibilityConfig
          }
          sessionIds={extendedWorkspaceData.sessionIds}
          chatEntryMessage={{
            role: 'assistant',
            content: `Welcome to ${
              workspaceData?.title || 'this project'
            }! I'm here to help you understand the learnings across the linked discussions.

Here are some questions you might want to ask:
  - What were the main themes discussed during the sessions?
  - What was controversial, and where did participants agree?`,
          }}
          showEdit={!loadingUserInfo && hasMinimumRole('owner')}
          draft={!exists}
        >
          <SessionInsightsGrid
            hostSessions={extendedWorkspaceData.hostSessions}
            userData={extendedWorkspaceData.userData}
            workspaceId={workspaceId}
            showEdit={!exists || (!loadingUserInfo && hasMinimumRole('owner'))}
            availableSessions={extendedWorkspaceData.availableSessions}
          />
          </ResultTabs>
      </div>
    </>
  );
}
