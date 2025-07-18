import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { checkSummaryNeedsUpdating } from '@/lib/summaryActions';
import { SummaryUpdateManager } from '../summary/SummaryUpdateManager';
import { RefreshStatus } from '@/components/SessionResult/ExpandableWithExport';

export function useSummaryUpdater(resourceId: string) {
  const lastCheckedRef = useRef<number>(0);
  const statusRef = useRef(RefreshStatus.Unknown);  // TODO: Or an 'unknown' state might be better actually?

  // Poll for summary version changes
  const { data: updateTimes } = useSWR(
    resourceId ? ['summary-version', resourceId] : null,
    ([_, id]) => checkSummaryNeedsUpdating(id),
    { 
      refreshInterval: 10000, // Poll every 10 seconds
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false
    }
  );

  // Check if summary needs updating and trigger automatic update
  useEffect(() => {
    if (!updateTimes) return;
    
    const { last_edit, last_summary_update } = updateTimes;

    if (lastCheckedRef.current === last_edit) {
      return; // Update should be already in progress, don't send it again
    }

    const delay = 30000; // Only update if last edit is older than 30 seconds

    // Only trigger if we have actual timestamp data and edit is newer than summary
    if (last_edit > last_summary_update) {
      statusRef.current = RefreshStatus.UpdatePending;

      if (Date.now() - last_edit > delay) {
        console.log('[i] Summary is stale, triggering automatic update');
      
        // Trigger automatic summary update
        SummaryUpdateManager.updateNow(resourceId, { source: 'auto' })
          .catch((error: any) => console.error('Auto-update failed:', error));
      
        // Track that we've processed this edit timestamp
        lastCheckedRef.current = last_edit;
      }
    } else {
      statusRef.current = RefreshStatus.UpToDate;
    }
  }, [updateTimes, resourceId]);

  return {
    version: updateTimes,
    isPolling: !!resourceId,
    status: statusRef.current,
  };
}
