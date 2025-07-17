import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getSummaryVersion } from '@/lib/summaryActions';
import { SummaryUpdateManager } from '../summary/SummaryUpdateManager';

export function useLiveSummary(resourceId: string) {
  const lastCheckedRef = useRef<number>(0);

  // Poll for summary version changes
  const { data: version } = useSWR(
    resourceId ? ['summary-version', resourceId] : null,
    ([_, id]) => getSummaryVersion(id),
    { 
      refreshInterval: 10000, // Poll every 10 seconds
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false
    }
  );

  // Check if summary needs updating and trigger automatic update
  useEffect(() => {
    if (!version) return;
    
    const { last_edit, last_summary_update } = version;
    
    // Only trigger if we have actual timestamp data and edit is newer than summary
    if (last_edit > last_summary_update && last_edit !== lastCheckedRef.current) {
      console.log('Summary is stale, triggering automatic update');
      
      // Trigger automatic summary update
      SummaryUpdateManager.updateNow(resourceId, { source: 'auto' })
        .catch((error: any) => console.error('Auto-update failed:', error));
      
      // Track that we've processed this edit timestamp
      lastCheckedRef.current = last_edit;
    }
  }, [version, resourceId]);

  return {
    version,
    isPolling: !!resourceId
  };
}
