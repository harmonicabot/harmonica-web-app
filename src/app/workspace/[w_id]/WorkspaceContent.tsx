'use client';

import ResultTabs from '@/components/SessionResult/ResultTabs';
import WorkspaceHero from '@/components/workspace/WorkspaceHero';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';
import ShareWorkspace from '@/components/workspace/ShareWorkspace';
import { ResultTabsVisibilityConfig, Workspace } from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { createNewWorkspace, updateWorkspaceDetails } from './actions';
import { useEffect, useState } from 'react';
import { ExtendedWorkspaceData } from '@/lib/types';

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
  extendedWorkspaceData: ExtendedWorkspaceData;
  workspaceId: string;
  isPublicAccess?: boolean;
}

export default function WorkspaceContent({
  extendedWorkspaceData,
  workspaceId,
  isPublicAccess,
}: WorkspaceContentProps) {

  const initialWorkspaceData = extendedWorkspaceData?.workspace
  const [workspaceData, setWorkspaceData] = useState<Workspace | undefined>(initialWorkspaceData);

  // Update state when initialWorkspaceData changes (e.g., after fetch)
  useEffect(() => {
    if (initialWorkspaceData) {
      setWorkspaceData(initialWorkspaceData);
    }
  }, [initialWorkspaceData]);

  // Function to handle updates from child components
  const handleWorkspaceUpdate = (updates: Workspace) => {
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
    console.log("Saving workspace: ", workspaceData)
    if (workspaceData) {
      if (workspaceId) {
        workspaceData.id = workspaceId; // If this is enabled we can navigate to arbitrary pages to create new ids (instead of using random ids);
      }
      await createNewWorkspace(workspaceData)
    }
  }

  const updateWorkspace = async () => {
    if (workspaceData) {
      updateWorkspaceDetails(workspaceId, workspaceData)
    }
  }

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
          isEditable={!exists || (!loadingUserInfo && hasMinimumRole('owner'))}
          onUpdate={handleWorkspaceUpdate}
        />
        {!loadingUserInfo && hasMinimumRole('owner') && exists && (
          <div className="flex gap-2 self-end mt-4">
            <ShareWorkspace workspaceId={workspaceId} />
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
            content: `Welcome to ${workspaceData?.title || 'this workspace'}! I'm here to help you understand the learnings across the linked discussions.

Here are some questions you might want to ask:
  - What were the main themes discussed during the sessions?
  - What was controversial, and where did participants agree?`,
          }}
          showEdit={!loadingUserInfo && hasMinimumRole('owner')}
          isNewWorkspace={!exists}
        />
      </div>

      <SessionInsightsGrid
        hostSessions={extendedWorkspaceData.hostSessions}
        userData={extendedWorkspaceData.userData}
        workspaceId={workspaceId}
        isPublicAccess={isPublicAccess}
        showEdit={!exists || (!loadingUserInfo && hasMinimumRole('owner'))}
      />
      {!exists && (
        <Button className="mt-4" onClick={submitNewWorkspace}>Create Workspace</Button>
      )}
    </>
  );
}
