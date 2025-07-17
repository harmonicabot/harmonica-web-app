import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { getSummaryVersion } from '@/lib/serverUtils';

const serverActionFetcher = (resourceId: string) => getSummaryVersion(resourceId);

export function useLiveSummary(resourceId: string) {
  const cachedLastUpdated = useRef<string | null>(null);

  // Poll for summary version changes
  const { data: version } = useSWR(
    resourceId ? ['summary-version', resourceId] : null,
    ([_, id]) => serverActionFetcher(id),
    { 
      refreshInterval: 10000, // Poll every 10 seconds
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false
    }
  );

  // When version changes, invalidate summary cache
  useEffect(() => {
    if (version?.lastUpdated && version.lastUpdated !== cachedLastUpdated.current) {
      if (cachedLastUpdated.current !== null) {
        // Don't trigger on initial load, only on actual changes
        console.log('Summary version changed, refreshing summary data');
        
        // Refresh the page to get latest summary data
        // This is a simple but effective approach
        window.location.reload();
      }
      cachedLastUpdated.current = version.lastUpdated;
    }
  }, [version?.lastUpdated, resourceId]);

  return {
    lastUpdated: version?.lastUpdated,
    isPolling: !!resourceId
  };
}
