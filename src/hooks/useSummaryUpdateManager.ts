'use client';

import { useEffect, useState } from 'react';
import { useSummaryStatus, useUpdateSummary } from '@/stores/SessionStore';

export enum RefreshStatus {
  Unknown,
  Outdated,
  UpdatePending,
  UpToDate,
}

interface UseUpdateManagerOptions {
  isProject?: boolean;
  sessionIds?: string[];
  projectId?: string;
  source?: 'participants' | 'chat' | 'ui' | 'auto';
  userSessionId?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export function useSummaryUpdateManager(
  resourceId: string, 
  options: UseUpdateManagerOptions = {}
) {
  const { 
    isProject = false, 
    sessionIds, 
    projectId
  } = options;

  const [lastEditTimestamp, setLastEditTimestamp] = useState<number>();
  
  // Use optimized summary status that leverages cached data
  const { 
    data: summaryStatus, 
    isLoading, 
    error,
    refetch 
  } = useSummaryStatus(resourceId, isProject);
  
  const updateSummary = useUpdateSummary();

  // Calculate current status
  const status = (() => {
    if (isLoading || !summaryStatus) return RefreshStatus.Unknown;
    
    const delay = 30000; // 30 seconds
    const now = Date.now();
    
    if (summaryStatus.lastEdit > summaryStatus.lastSummaryUpdate) {
      if (now - summaryStatus.lastEdit > delay && !updateSummary.isPending) {
        return RefreshStatus.UpdatePending;
      }
      return RefreshStatus.Outdated;
    }
    
    return RefreshStatus.UpToDate;
  })();

  // Auto-trigger updates when status becomes UpdatePending
  useEffect(() => {
    if (status === RefreshStatus.UpdatePending && 
        summaryStatus && 
        summaryStatus.lastEdit !== lastEditTimestamp) {
      
      console.log(`[useSummaryUpdateManager] Auto-triggering update for ${resourceId}`);
      
      updateSummary.mutate({
        sessionId: resourceId,
        isProject,
        sessionIds,
        projectId
      });
      
      setLastEditTimestamp(summaryStatus.lastEdit);
    }
  }, [status, summaryStatus, lastEditTimestamp, resourceId, isProject, sessionIds, projectId, updateSummary]);

  // Manual update function
  const updateNow = async () => {
    if (updateSummary.isPending) {
      console.log(`[useSummaryUpdateManager] Update already running for ${resourceId}`);
      return;
    }

    console.log(`[useSummaryUpdateManager] Manual update triggered for ${resourceId}`);
    
    try {
      const result = await updateSummary.mutateAsync({
        sessionId: resourceId,
        isProject,
        sessionIds,
        projectId
      });
      
      console.log(`[useSummaryUpdateManager] Update completed for ${resourceId}`);
      return result;
    } catch (error) {
      console.error(`[useSummaryUpdateManager] Update failed for ${resourceId}:`, error);
      throw error;
    }
  };

  // Polling control
  const startPolling = () => {
    console.log(`[useSummaryUpdateManager] Starting polling for ${resourceId}`);
    // TanStack Query handles polling automatically via refetchInterval
    // We could force a refetch here if needed
    refetch();
  };

  const stopPolling = () => {
    console.log(`[useSummaryUpdateManager] Stopping polling for ${resourceId}`);
    // TanStack Query polling is controlled by the query options
    // Individual queries can be paused, but it's handled at query level
  };

  return {
    // State
    status,
    isRunning: updateSummary.isPending,
    isLoading,
    error: error || updateSummary.error,
    lastEditTimestamp: summaryStatus?.lastEdit,
    version: summaryStatus ? {
      lastEdit: summaryStatus.lastEdit,
      lastSummaryUpdate: summaryStatus.lastSummaryUpdate
    } : undefined,
    
    // Actions
    updateNow,
    startPolling,
    stopPolling,
    refetch,
    
    // Compatibility with old SummaryUpdateManager interface
    getState: () => ({
      isRunning: updateSummary.isPending,
      lastEditTimestamp: summaryStatus?.lastEdit,
      status,
      version: summaryStatus ? {
        lastEdit: summaryStatus.lastEdit,
        lastSummaryUpdate: summaryStatus.lastSummaryUpdate
      } : undefined,
      listeners: new Set(), // Not used in React hook version
    }),
    
    // React-specific
    subscribe: () => {
      // In React hooks, subscriptions are handled by the hook itself
      // Return a no-op cleanup function for compatibility
      return () => {};
    },
  };
}