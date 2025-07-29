'use client';

import { useEffect, useState, useRef } from 'react';
import { useSummaryStatus, useUpdateSummary } from '@/stores/SessionStore';

export enum RefreshStatus {
  Unknown,
  Outdated,
  UpdatePending,
  UpdateStarted,
  UpToDate,
}

export function useSummaryUpdateManager(
  resourceId: string,
  sessionIds?: string[],  // Provided for projects
) {

  const [status, setStatus] = useState(RefreshStatus.Unknown)

  // Use optimized summary status that leverages cached data
  const {
    data: summaryStatus,
    isLoading,
    error
  } = useSummaryStatus(resourceId, sessionIds && sessionIds.length > 0);

  const summaryUpdater = useUpdateSummary();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout when dependencies change or component unmounts
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []); // Empty dependency array ensures this cleanup runs only on unmount

  useEffect(() => {
    if (isLoading || !summaryStatus) {
      setStatus(RefreshStatus.Unknown);
      return;
    }

    const delay = 30000; // 30 seconds

    if (summaryStatus.lastEdit > summaryStatus.lastSummaryUpdate) {
      console.log(`[useSummaryUpdateManager] Registered some edit. Schedule summary update for ${resourceId}`);
      // We only get here if there was some sort of edit. So let's reschedule any previously scheduled update
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

      setStatus(RefreshStatus.UpdatePending);
      timeoutIdRef.current = setTimeout(() => {
        startUpdateNow();
      }, delay); // Calculate remaining time
    } else {
      setStatus(RefreshStatus.UpToDate);
    }
  }, [summaryStatus, resourceId, sessionIds]);

  const startUpdateNow = async () => {
    if (summaryUpdater.isPending || status === RefreshStatus.UpdateStarted) {
      console.log(`[useSummaryUpdateManager] Update already running for ${resourceId}`);
      return;
    }
    setStatus(RefreshStatus.UpdateStarted);
    console.log(`[useSummaryUpdateManager] Update triggered for ${resourceId}`);

    try {
      const result = await summaryUpdater.mutateAsync({
        resourceId,
        sessionIds,
      });

      console.log(`[useSummaryUpdateManager] Update completed for ${resourceId}`);
      return result;
    } catch (error) {
      console.error(`[useSummaryUpdateManager] Update failed for ${resourceId}:`, error);
      throw error;
    }
  };

  return {
    // State
    status,
    isRunning: summaryUpdater.isPending,
    isLoading,
    error: error || summaryUpdater.error,
    lastEditTimestamp: summaryStatus?.lastEdit,
    version: summaryStatus ? {
      lastEdit: summaryStatus.lastEdit,
      lastSummaryUpdate: summaryStatus.lastSummaryUpdate
    } : undefined,

    // Actions to trigger updates manually
    startUpdateNow,

    // React-specific
    subscribe: () => {
      // In React hooks, subscriptions are handled by the hook itself
      // Return a no-op cleanup function for compatibility
      return () => {};
    },
  };
}