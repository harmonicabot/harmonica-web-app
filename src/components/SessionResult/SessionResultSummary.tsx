import { HostSession } from '@/lib/schema';
import { useState } from 'react';
import { createMultiSessionSummary, createSummary } from '@/lib/serverUtils';
import { ExpandableWithExport } from './ExpandableWithExport';
import * as db from '@/lib/db';

interface SessionResultSummaryProps {
  hostData: HostSession[];
  isWorkspace: boolean;
  workspaceId?: string;
  newSummaryContentAvailable: boolean;
  onUpdateSummary: () => void;
  showSessionRecap: boolean;
}

export default function SessionResultSummary({
  hostData, // one or more (e.g. if workspace)
  isWorkspace = false,
  workspaceId,
  newSummaryContentAvailable,
  onUpdateSummary,
  showSessionRecap = true,
}: SessionResultSummaryProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [isExpandedSummary, setIsExpandedSummary] = useState(true);
  const [summary, setSummary] = useState(isWorkspace ? ''/*TODO: db.getWorkspaceSummary(workspaceId)*/ : hostData[0].summary);

  const triggerSummaryUpdate = () => {
    setIsUpdating(true);
    if (isWorkspace) {
      createMultiSessionSummary(hostData.map(data => data.id), workspaceId!)
        .then((summary) => {
          setIsUpdating(false);
          onUpdateSummary();
          setSummary("Summary from MessageContent");  // TODO: use the actual summary
        });
    } else {
      createSummary(hostData[0].id)
        .then((summary) => {
          setIsUpdating(false);
          onUpdateSummary();
          setSummary(summary);
        });
    }
  };

  return (
    <>
      {showSessionRecap && !isWorkspace && hostData[0].prompt_summary && (
        // We don't show this for workspaces (for now); but we might change that in the future
        <div className="mb-4 relative">
          <ExpandableWithExport
            title="Session Recap"
            content={hostData[0].prompt_summary}
            isExpanded={isExpandedPrompt}
            onExpandedChange={setIsExpandedPrompt}
          />
        </div>
      )}
      <ExpandableWithExport
        title="Session Summary"
        content={summary}
        isExpanded={isExpandedSummary}
        onExpandedChange={setIsExpandedSummary}
        showRefreshButton={newSummaryContentAvailable}
        onRefresh={triggerSummaryUpdate}
        isUpdating={isUpdating}
        loading={!summary}
      />
    </>
  );
}