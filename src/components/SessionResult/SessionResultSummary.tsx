import { HostSession } from '@/lib/schema';
import { useEffect, useState } from 'react';
import { createMultiSessionSummary, createSummary } from '@/lib/serverUtils';
import { ExpandableWithExport } from './ExpandableWithExport';
import * as db from '@/lib/db';
import { Info } from 'lucide-react';
import { LimitPopup } from '../pricing/LimitPopup';
import { useSubscription } from 'hooks/useSubscription';

interface SessionResultSummaryProps {
  hostData: HostSession[];
  isWorkspace: boolean;
  workspaceId?: string;
  numSessions: number;
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
  numSessions,
  showSessionRecap = true,
}: SessionResultSummaryProps) {
  const { status: subscription_status } = useSubscription();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [isExpandedSummary, setIsExpandedSummary] = useState(true);
  const [summary, setSummary] = useState(
    isWorkspace ? '' : hostData[0]?.summary || '',
  );
  const [isLimitPopupOpen, setIsLimitPopupOpen] = useState(false);

  const isLimitReached = subscription_status === 'FREE' && numSessions > 10;

  const triggerSummaryUpdate = () => {
    setIsUpdating(true);
    if (isWorkspace) {
      createMultiSessionSummary(
        hostData.map((data) => data.id),
        workspaceId!,
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
    // if (isWorkspace) triggerSummaryUpdate();
    if (isWorkspace && workspaceId) {
      db.getWorkspaceSummary(workspaceId!).then((summary) => {
        if (summary) {
          console.log(summary);
          setSummary(summary);
        } else {
          triggerSummaryUpdate();
        }
      });
    }
  }, [isWorkspace, workspaceId]);

  return (
    <>
      {isLimitReached && (
        <div className="mb-4 flex items-center text-sm text-amber-600 dark:text-amber-400">
          <Info
            size={16}
            className="mr-1 cursor-pointer"
            onClick={() => setIsLimitPopupOpen(true)}
            aria-label="Upgrade to Pro for unlimited participants"
          />
          Summary limited to 10 participants.
          <LimitPopup
            open={isLimitPopupOpen}
            onOpenChange={setIsLimitPopupOpen}
            hitLimit="SUMMARY"
          />
        </div>
      )}
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
        showRefreshButton={newSummaryContentAvailable || !summary}
        onRefresh={triggerSummaryUpdate}
        isUpdating={isUpdating}
        loading={!summary}
      />
    </>
  );
}
