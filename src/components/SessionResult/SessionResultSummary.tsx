'use client'
import { HostSession } from '@/lib/schema';
import { useEffect, useState } from 'react';
import { createMultiSessionSummary } from '@/lib/serverUtils';
import { SummaryUpdateManager } from '../../summary/SummaryUpdateManager';
import { ExpandableWithExport, RefreshStatus } from './ExpandableWithExport';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import * as db from '@/lib/db';
import { Card, CardContent } from '../ui/card';
import { usePermissions } from '@/lib/permissions';
import { useSessionStore } from '@/stores/SessionStore';
import { useSummaryUpdater } from '@/hooks/useLiveSummary';
import { useSummary } from '@/hooks/useSummary';
import { mutate } from 'swr';

interface SessionResultSummaryProps {
  hostData: HostSession[];
  isProject: boolean;
  projectId?: string;
  draft: boolean;
  newSummaryContentAvailable: boolean;
  onUpdateSummary: () => void;
  showSummary?: boolean;
  showSessionRecap?: boolean;
  isDebouncedUpdateScheduled?: boolean;
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
  isDebouncedUpdateScheduled = false,
}: SessionResultSummaryProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [isExpandedSummary, setIsExpandedSummary] = useState(true);

  const resourceId: string = isProject ? projectId! : hostData[0].id;
  const { hasMinimumRole } = usePermissions(resourceId);
  const userData = useSessionStore((state) => state.userData[resourceId] || []);
  
  // Use SWR to fetch summary content with initial data as fallback
  const initialSummary = isProject ? '' : hostData[0]?.summary || '';
  const { data: summary, isLoading: summaryLoading } = useSummary(resourceId, initialSummary, isProject);

  // Calculate refresh status
  const getRefreshStatus = (): RefreshStatus => {
    // If a debounced update is scheduled, show orange
    if (isDebouncedUpdateScheduled) {
      return RefreshStatus.AutoRefreshPending;
    }

    if (!newSummaryContentAvailable) {
      return RefreshStatus.UpToDate;
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
          return RefreshStatus.AutoRefreshPending;
        }
      }
    }

    // New content available but not auto-refreshing
    return RefreshStatus.NeedsRefresh;
  };

  const refreshStatus = getRefreshStatus();

  const triggerSummaryUpdate = () => {
    setIsUpdating(true);
    if (isProject) {
      createMultiSessionSummary(
        hostData.map((data) => data.id),
        projectId!,
      ).then((summary) => {
        setIsUpdating(false);
        onUpdateSummary();
        // Manually update SWR cache for projects
        mutate(['summary-content', resourceId], summary.toString(), false);
      });
    } else {
      SummaryUpdateManager.updateNow(hostData[0].id).then(() => {
        setIsUpdating(false);
        onUpdateSummary();
        // Summary will be updated automatically via SWR
      });
    }
  };

  useEffect(() => {
    if (isProject && projectId && !draft && !summary) {
      // If no initial summary exists for project, trigger update
      SummaryUpdateManager.updateNow(projectId!);
    }
  }, [isProject, projectId, draft, summary]);

  // Use live summary polling
  useSummaryUpdater(resourceId);

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
        loading={summaryLoading || isUpdating}
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
