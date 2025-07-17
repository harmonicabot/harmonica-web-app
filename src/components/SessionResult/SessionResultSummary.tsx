'use client'
import { HostSession } from '@/lib/schema';
import { useEffect, useState } from 'react';
import { createMultiSessionSummary, createSummary } from '@/lib/serverUtils';
import { ExpandableWithExport, RefreshStatus } from './ExpandableWithExport';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import * as db from '@/lib/db';
import { Card, CardContent } from '../ui/card';
import { usePermissions } from '@/lib/permissions';
import { useSessionStore } from '@/stores/SessionStore';
import { useLiveSummary } from '@/hooks/useLiveSummary';

interface SessionResultSummaryProps {
  hostData: HostSession[];
  isProject: boolean;
  projectId?: string;
  draft: boolean;
  newSummaryContentAvailable: boolean;
  onUpdateSummary: () => void;
  showSummary?: boolean;
  showSessionRecap?: boolean;
  cancelScheduledUpdate?: () => void;
}

export default function SessionResultSummary({
  hostData, // one or more (e.g. if project)
  isProject = false,
  projectId,
  draft = false,
  newSummaryContentAvailable,
  onUpdateSummary,
  showSummary = true,
  showSessionRecap = true,
  cancelScheduledUpdate,
}: SessionResultSummaryProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [isExpandedSummary, setIsExpandedSummary] = useState(true);
  const [summary, setSummary] = useState(
    isProject ? '' : hostData[0]?.summary || '',
  );

  const resourceId: string = isProject ? projectId! : hostData[0].id;
  const { hasMinimumRole } = usePermissions(resourceId);
  const userData = useSessionStore((state) => state.userData[resourceId] || []);

  // Calculate refresh status
  const getRefreshStatus = (): RefreshStatus => {
    if (!newSummaryContentAvailable) {
      return 'up-to-date';
    }

    // For single sessions, check if auto-refresh would trigger
    if (!isProject && userData.length > 0) {
      const { hasNewMessages, lastMessage, lastSummaryUpdate } = checkSummaryAndMessageTimes(
        hostData[0], 
        userData as any[]
      );
      
      if (hasNewMessages && lastMessage > lastSummaryUpdate) {
        const timeSinceLastUpdate = new Date().getTime() - lastSummaryUpdate;
        const tenMinutesInMs = 1000 * 60 * 10;
        
        // If auto-refresh would trigger (> 10 minutes), show orange
        if (timeSinceLastUpdate > tenMinutesInMs) {
          return 'auto-refresh-pending';
        }
      }
    }

    // New content available but not auto-refreshing
    return 'needs-refresh';
  };

  const refreshStatus = getRefreshStatus();

  const triggerSummaryUpdate = () => {
    cancelScheduledUpdate?.(); // Cancel any pending auto-update
    setIsUpdating(true);
    if (isProject) {
      createMultiSessionSummary(
        hostData.map((data) => data.id),
        projectId!,
      ).then((summary) => {
        setIsUpdating(false);
        onUpdateSummary();
        setSummary(summary.toString());
      });
    } else {
      createSummary(hostData[0].id).then((summary) => {
        setIsUpdating(false);
        onUpdateSummary();
        setSummary(summary.toString());
      });
    }
  };

  useEffect(() => {
    if (isProject && projectId && !draft) {
      db.getWorkspaceSummary(projectId!).then((summary) => {
        if (summary) {
          console.log(summary)
          setSummary(summary);
        } else {
          triggerSummaryUpdate();
        }
      });
    }
  }, [isProject, projectId]);

  // Use live summary polling
  useLiveSummary(resourceId);

// Check which content will be shown
const showSessionRecapContent = showSessionRecap && !isProject && hostData[0]?.prompt_summary;
const showSummaryContent = showSummary && summary;
const showDraftProjectCard = isProject && draft;
const showAnyContent = showSessionRecapContent || showSummaryContent || showDraftProjectCard;

return (
  <>
    {showSessionRecapContent && (
      <div className="mb-4 relative">
        <ExpandableWithExport
          title="Session Recap"
          content={hostData[0].prompt_summary}
          isExpanded={isExpandedPrompt}
          onExpandedChange={setIsExpandedPrompt}
        />
      </div>
    )}
    {showSummaryContent ? (
      <ExpandableWithExport
        title={isProject ? "Project Summary" : "Session Summary"}
        content={summary}
        isExpanded={isExpandedSummary}
        onExpandedChange={setIsExpandedSummary}
        showRefreshButton={newSummaryContentAvailable || !summary || hasMinimumRole('editor')}
        onRefresh={triggerSummaryUpdate}
        isUpdating={isUpdating}
        loading={!summary}
        refreshStatus={refreshStatus}
      />
    ) : showDraftProjectCard ? (
      <Card className="border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <h3 className="text-2xl font-semibold text-gray-700">
            Project Summary
          </h3>
          <p className="text-gray-500">
            Here you will see summary information about your project sessions. 
            Add sessions to your project to see insights across all discussions.
          </p>
        </div>
      </Card>
    ) : !showAnyContent && (
      <Card>
        <CardContent className="py-4">
          Nothing here yet ¯\_(ツ)_/¯
        </CardContent>
      </Card>
    )}
  </>
);
}
