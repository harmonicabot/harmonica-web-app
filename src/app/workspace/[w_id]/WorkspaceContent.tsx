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
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ExtendedWorkspaceData } from '@/lib/types';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';
import { PromptSettings } from '@/components/SessionResult/ResultTabs/components/PromptSettings';
import { toast } from 'hooks/use-toast';
import * as db from '@/lib/db';
import { Loader2 } from 'lucide-react';
import { useSessionStore } from '@/stores/SessionStore';

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
  // Prime the store with initial data if needed (SSR hydration)
  const {
    workspaceMapping,
    workspaceData,
    addHostData,
    addUserData,
    addWorkspaceData,
  } = useSessionStore((state) => ({
    ...state,
    workspaceMapping: state.workspaceMapping[workspaceId],
    workspaceData: state.workspaceData[workspaceId]
  }));

  // Hydrate store on mount if not already present
  useEffect(() => {
    if (!workspaceMapping) {
      addWorkspaceData(workspaceId, extendedWorkspaceData.workspace,extendedWorkspaceData.hostSessions.map(hs => hs.id));
      extendedWorkspaceData.hostSessions.forEach(hostSession => {
        addHostData(hostSession.id, hostSession);
        addUserData(hostSession.id, extendedWorkspaceData.userData.filter(user => user.session_id === hostSession.id));
      });
    }
  }, [addHostData, addUserData, addWorkspaceData, extendedWorkspaceData, workspaceId, workspaceMapping]);

  // We still need the 'extendedData' object as separate var to keep track of linked sessions & exist status etc...
  const [extendedData, setExtendedData] = useState(extendedWorkspaceData);

  const {
    hasMinimumRole,
    loading: loadingUserInfo,
    isPublic,
  } = usePermissions(workspaceId);

  // Memoize visibility config
  const visibilityConfig = useMemo(
    () =>
      isPublic
        ? {
            showSummary: true,
            showResponses: false,
            showCustomInsights: false,
            showSimScore: false,
            showChat: true,
            allowCustomInsightsEditing: false,
            showSessionRecap: true,
          }
        : defaultWorkspaceVisibilityConfig,
    [isPublic],
  );

  const exists = extendedData.exists;

  // Memoize permission checks
  const isEditable = useMemo(
    () => !exists || hasMinimumRole('editor'),
    [exists, hasMinimumRole],
  );

  const canEdit = useMemo(() => hasMinimumRole('editor'), [hasMinimumRole]);

  // Memoize the handleWorkspaceUpdate callback
  const handleWorkspaceUpdate = useCallback((updates: Workspace) => {
    // TODO check where this is used!
    throw new ReferenceError("This method is not implemented yet; it should update the store directly where it's called. See second-last element in the stack.")
  }, []);

  // Memoize the handlePromptChange callback
  const handlePromptChange = useCallback(
    async (newPrompt: string) => {
      try {
        const updateData = { summary_prompt: newPrompt };
        const result = await db.updateWorkspace(workspaceId, updateData);

        if (result) {
          // TODO check where this is used!
          throw new ReferenceError("This method is not implemented yet; it should update the store directly where it's called. See second-last element in the stack.")
        } else {
          toast({
            title: 'Failed to update prompt',
            description:
              'An error occurred while updating the prompt. Changes were not saved.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to update prompt:', error);
        toast({
          title: 'Failed to update prompt',
          description: 'An error occurred while updating the prompt.',
          variant: 'destructive',
        });
      }
    },
    [workspaceId],
  );

  const handlePromptChangeSession = async (
      newPrompt: string,
      type: 'facilitation' | 'summary',
    ) => {
      try {
        const updateData =
          type === 'facilitation'
            ? { prompt: newPrompt }
            : { summary_prompt: newPrompt };
  
        await db.updateHostSession(id, updateData);
      } catch (error) {
        console.error('Failed to update prompt:', error);
        toast({
          title: 'Failed to update prompt',
          description: 'An error occurred while updating the prompt.',
          variant: 'destructive',
        });
      }
    };

  // Memoize the chat entry message
  const chatEntryMessage = useMemo(
    () => ({
      role: 'assistant' as const,
      content: `Welcome to ${
        workspaceData?.title || 'this project'
      }! I'm here to help you understand the learnings across the linked discussions.

Here are some questions you might want to ask:
  - What were the main themes discussed during the sessions?
  - What was controversial, and where did participants agree?`,
    }),
    [workspaceData?.title],
  );

  if (loadingUserInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
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
          bannerImageUrl={workspaceData?.bannerImage}
          initialGradientFrom={workspaceData?.gradientFrom}
          initialGradientTo={workspaceData?.gradientTo}
          initialUseGradient={workspaceData?.useGradient}
          isEditable={isEditable}
          onUpdate={handleWorkspaceUpdate}
        />
        {isEditable && (
          <div className="flex items-center gap-4 self-end mt-4">
            <PromptSettings
              isProject={false}
              summaryPrompt={workspaceData.summary_prompt}
              onPromptChange={handlePromptChange}
            />
            <ShareSettings resourceId={workspaceId} resourceType="WORKSPACE" />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col lg:flex-row gap-4">
        <ResultTabs
          resourceId={workspaceId}
          isWorkspace={true}
          visibilityConfig={
            workspaceData?.visibility_settings || visibilityConfig
          }
          sessionIds={extendedData.sessionIds}
          chatEntryMessage={chatEntryMessage}
          showEdit={canEdit}
          draft={!exists}
        >
          <SessionInsightsGrid
            hostSessions={extendedData.hostSessions}
            userData={extendedData.userData}
            workspaceId={workspaceId}
            showEdit={!exists || canEdit}
            availableSessions={extendedData.availableSessions}
          />
        </ResultTabs>
      </div>
    </>
  );
}
