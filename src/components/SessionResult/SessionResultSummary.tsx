import { HostSession } from '@/lib/schema';
import { useState } from 'react';
import { createSummary } from '@/lib/serverUtils';
import { exportService } from '@/lib/export/exportService';
import { ExpandableWithExport } from './ExpandableWithExport';

interface SessionResultSummaryProps {
  hostData: HostSession;
  newSummaryContentAvailable: boolean;
  onUpdateSummary: () => void;
  showSessionRecap: boolean;
}

export default function SessionResultSummary({
  hostData,
  newSummaryContentAvailable,
  onUpdateSummary,
  showSessionRecap = true,
}: SessionResultSummaryProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [isExpandedSummary, setIsExpandedSummary] = useState(true);

  const triggerSummaryUpdate = () => {
    setIsUpdating(true);
    createSummary(hostData.id).then(() => {
      setIsUpdating(false);
      onUpdateSummary();
    });
  };

  return (
    <>
      {showSessionRecap && hostData.prompt_summary && (
        <div className="mb-4 relative">
          <ExpandableWithExport
            title="Session Recap"
            content={hostData.prompt_summary}
            isExpanded={isExpandedPrompt}
            onExpandedChange={setIsExpandedPrompt}
          />
        </div>
      )}
      <ExpandableWithExport
        title="Session Summary"
        content={hostData.summary}
        isExpanded={isExpandedSummary}
        onExpandedChange={setIsExpandedSummary}
        showRefreshButton={newSummaryContentAvailable}
        onRefresh={triggerSummaryUpdate}
        isUpdating={isUpdating}
        loading={!hostData.summary}
      />
    </>
  );
}