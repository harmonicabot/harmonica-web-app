'use client';

import ResultTabs from '@/components/SessionResult/ResultTabs';
import WorkspaceHero from '@/components/workspace/WorkspaceHero';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';
import ShareWorkspace from '@/components/workspace/ShareWorkspace';
import { NewWorkspace, ResultTabsVisibilityConfig, Workspace } from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { updateWorkspaceDetails } from './actions';
import { useEffect, useState } from 'react';
import { ExtendedWorkspaceData } from '@/lib/types';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

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
  isPublicAccess = false,
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

  const { hasMinimumRole, loading: loadingUserInfo } =
    usePermissions(workspaceId);

  const submitNewWorkspace = async () => {
    console.log('Saving workspace: ', workspaceData);
    const tempWorkspaceData: Workspace | NewWorkspace = {
      ...workspaceData,
      status: 'active',
    }
    await updateWorkspaceDetails(workspaceId, tempWorkspaceData);
  };

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
        {!loadingUserInfo && hasMinimumRole('owner') && (
          <div className="flex items-center gap-4 self-end mt-4">
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
          isPublic={workspaceData?.is_public}
          chatEntryMessage={{
            role: 'assistant',
            content: `Welcome to ${
              workspaceData?.title || 'this workspace'
            }! I'm here to help you understand the learnings across the linked discussions.

Here are some questions you might want to ask:
  - What were the main themes discussed during the sessions?
  - What was controversial, and where did participants agree?`,
          }}
          showEdit={!loadingUserInfo && hasMinimumRole('owner')}
          draft={!exists}
        />
      </div>

      <SessionInsightsGrid
        hostSessions={extendedWorkspaceData.hostSessions}
        userData={extendedWorkspaceData.userData}
        workspaceId={workspaceId}
        isPublicAccess={isPublicAccess}
        showEdit={!exists || (!loadingUserInfo && hasMinimumRole('owner'))}
        availableSessions={extendedWorkspaceData.availableSessions}
      />
      {!exists && workspaceData && (
        <Button className="mt-4" onClick={submitNewWorkspace}>
          Create Workspace
        </Button>
      )}
    </>
  );
}
