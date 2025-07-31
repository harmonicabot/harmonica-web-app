'use client'
import { HostSession } from '@/lib/schema';
import { useState } from 'react';
import { ExpandableWithExport } from './ExpandableWithExport';
import { Card, CardContent } from '../ui/card';
import { usePermissions } from '@/lib/permissions';
import { useSummary } from '@/stores/SessionStore';

interface SessionResultSummaryProps {
  hostData: HostSession[];
  isProject: boolean;
  projectId?: string;
  draft: boolean;
  showSummary?: boolean;
  showSessionRecap?: boolean;
}

export default function SessionResultSummary({
  hostData, // one or more (e.g. if project)
  isProject = false,
  projectId,
  draft = false,
  showSummary = true,
  showSessionRecap = true,
}: SessionResultSummaryProps) {
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [isExpandedSummary, setIsExpandedSummary] = useState(true);

  const resourceId: string = isProject ? projectId! : hostData[0].id;
  const { hasMinimumRole } = usePermissions(resourceId);
  
  // Use SWR to fetch summary content with initial data as fallback
  const initialSummary = isProject ? '' : hostData[0]?.summary || '';
  const { data: summary, isLoading: summaryLoading } = useSummary(resourceId, initialSummary, isProject);
  
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
      {showSummaryContent ? (
        <ExpandableWithExport
          resourceId={resourceId}
          sessionIds={isProject ? hostData.map(h => h.id) : undefined}
          title={isProject ? "Project Summary" : "Session Summary"}
          content={summary}
          isExpanded={isExpandedSummary}
          onExpandedChange={setIsExpandedSummary}
          showRefreshButton={hasMinimumRole('editor')}
          loading={summaryLoading}
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
