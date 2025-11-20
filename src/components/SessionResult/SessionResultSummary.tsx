'use client'
import { HostSession } from '@/lib/schema';
import { useState, useEffect, useRef } from 'react';
import { SummaryUpdateManager } from '../../summary/SummaryUpdateManager';
import { ExpandableWithExport } from './ExpandableWithExport';
import { SummaryCard } from './SummaryCard';
import { Card, CardContent } from '../ui/card';
import { usePermissions } from '@/lib/permissions';
import { useSummary } from '@/hooks/useSummary';
import { PromptSettings } from './ResultTabs/components/PromptSettings';
import * as db from '@/lib/db';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

const SummarySkeleton = () => (
  <Card className="mb-4">
    <CardContent className="p-6">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

interface SessionResultSummaryProps {
  hostData: HostSession[];
  isProject: boolean;
  projectId?: string;
  draft: boolean;
  onUpdateSummary: () => void;
  showSummary?: boolean;
  showSessionRecap?: boolean;
}

export default function SessionResultSummary({
  hostData, // one or more (e.g. if project)
  isProject = false,
  projectId,
  draft = false,
  onUpdateSummary,
  showSummary = true,
  showSessionRecap = true,
}: SessionResultSummaryProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState(hostData[0]?.summary_prompt);
  const justSavedRef = useRef<string | null>(null);

  const resourceId: string = isProject ? projectId! : hostData[0].id;
  const { hasMinimumRole } = usePermissions(resourceId);
  const router = useRouter();

  // Sync local state with hostData when dialog opens to ensure we have the latest value
  // But only if we didn't just save (to preserve optimistic updates)
  useEffect(() => {
    if (showPromptSettings && !isProject) {
      // If we just saved, keep the optimistic value instead of syncing with potentially stale hostData
      if (justSavedRef.current === null) {
        // No recent save, sync with hostData
        setSummaryPrompt(hostData[0]?.summary_prompt);
      }
      // If we just saved (justSavedRef.current !== null), keep the optimistic value
      // The ref will be cleared when hostData updates and matches what we saved
    }
  }, [showPromptSettings, isProject, hostData[0]?.summary_prompt]);

  // Sync local state with hostData when it changes (e.g., after router.refresh)
  // Clear the ref when hostData matches what we saved
  useEffect(() => {
    if (!isProject && hostData[0]?.summary_prompt !== summaryPrompt) {
      // If hostData matches what we saved, we can clear the ref and sync
      if (justSavedRef.current !== null && justSavedRef.current === hostData[0]?.summary_prompt) {
        // hostData has been updated with our saved value, safe to sync
        justSavedRef.current = null;
        setSummaryPrompt(hostData[0]?.summary_prompt);
      } else if (justSavedRef.current === null) {
        // No recent save, safe to sync with hostData
        // Only sync when dialog is closed to avoid disrupting user edits
        if (!showPromptSettings) {
          setSummaryPrompt(hostData[0]?.summary_prompt);
        }
      }
      // If justSavedRef.current !== null and doesn't match hostData, keep optimistic value
    }
  }, [hostData[0]?.summary_prompt, isProject, showPromptSettings, summaryPrompt]);
  
  // Use SWR to fetch summary content with initial data as fallback
  const initialSummary = isProject ? '' : hostData[0]?.summary || '';
  const { data: summary, isLoading: summaryLoading } = useSummary(resourceId, initialSummary, isProject);
  
  const manuallyTriggerSummaryUpdate = () => {
    setIsUpdating(true);
    SummaryUpdateManager.updateNow(hostData[0].id).then(() => {
      setIsUpdating(false);
      onUpdateSummary();
      // Summary will be updated automatically via SWR
    });
  };

  const handleEditPrompt = () => {
    setShowPromptSettings(true);
  };

  const handleSummaryPromptChange = async (
    newPrompt: string,
    type: 'facilitation' | 'summary',
  ) => {
    if (type !== 'summary') {
      return; // Only handle summary prompt changes here
    }

    try {
      await db.updateHostSession(resourceId, { summary_prompt: newPrompt });
      // Update local state optimistically so it persists when dialog reopens
      setSummaryPrompt(newPrompt);
      // Track that we just saved this value to prevent syncing with stale hostData
      justSavedRef.current = newPrompt;
      toast({
        title: 'Summary prompt updated',
        description: 'The summary prompt has been successfully updated. Regenerating summary...',
      });
      // Refresh the page data
      router.refresh();
      // Trigger summary regeneration with the new prompt
      if (!isProject) {
        setIsUpdating(true);
        SummaryUpdateManager.updateNow(resourceId).then(() => {
          setIsUpdating(false);
          onUpdateSummary();
        }).catch((error) => {
          console.error('Failed to regenerate summary:', error);
          setIsUpdating(false);
        });
      }
    } catch (error) {
      console.error('Failed to update summary prompt:', error);
      toast({
        title: 'Failed to update summary prompt',
        description: 'An error occurred while updating the summary prompt.',
        variant: 'destructive',
      });
      throw error; // Re-throw to let PromptSettings handle the error
    }
  };

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
            resourceId={resourceId}
            title="Session Recap"
            content={hostData[0].prompt_summary}
            isExpanded={isExpandedPrompt}
            onExpandedChange={setIsExpandedPrompt}
          />
        </div>
      )}
      {summaryLoading && !summary ? (
        <SummarySkeleton />
      ) : showSummaryContent ? (
        <>
          <SummaryCard
            resourceId={resourceId}
            title={isProject ? "Project Summary" : "Session Summary"}
            content={summary}
            showRefreshButton={hasMinimumRole('editor')}
            onRefresh={manuallyTriggerSummaryUpdate}
            onEditPrompt={hasMinimumRole('editor') ? handleEditPrompt : undefined}
            isUpdating={isUpdating}
            loading={summaryLoading || isUpdating}
          />
          {!isProject && hasMinimumRole('editor') && (
            <PromptSettings
              isProject={false}
              summaryPrompt={summaryPrompt}
              onPromptChange={handleSummaryPromptChange}
              open={showPromptSettings}
              onOpenChange={setShowPromptSettings}
              hideTrigger={true}
            />
          )}
        </>
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
