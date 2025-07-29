'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSummaryStatus, useUpdateSummary } from '@/stores/SessionStore';
import { create } from 'zustand';

export enum RefreshStatus {
  Unknown,
  Outdated,
  UpdatePending,
  UpdateStarted,
  UpToDate,
}

// Define a global store for managing active updates,
// so that we don't schedule multiple updates from different components
interface UpdateManagerStore {
  // Add status for each resourceId
  status: Record<string, RefreshStatus>;
  lastRegisteredEdit: Record<string, number>;
  // Add actions to update status
  setStatus: (resourceId: string, status: RefreshStatus) => void;
  setLastRegisteredEdit: (resourceId: string, lastEdit: number) => void;
}

const useUpdateManagerStore = create<UpdateManagerStore>((set) => ({
  status: {},
  lastRegisteredEdit: {},
  setStatus: (resourceId, status) =>
    set((state) => {
      console.debug(`[UpdateManagerStore] Setting status for ${resourceId} to ${Object.keys(RefreshStatus).filter(k => isNaN(Number(k)))[status]}`);
      if (state.status[resourceId] === status) return state; // No change if status is the same; necessary to prevent infinite rerender loops
      return ({
        status: { ...state.status, [resourceId]: status },
      })
    }),
  setLastRegisteredEdit: (resourceId, lastEdit) => 
    set((state) => ({ lastRegisteredEdit: { ...state.lastRegisteredEdit, [resourceId]: lastEdit }}))
}));

export function useSummaryUpdateManager(
  resourceId: string,
  sessionIds?: string[] // Provided for projects
) {

  // Use optimized summary status that leverages cached data
  // This will be the main source of truth for incoming edits,
  // the only other thing that should trigger an update is manually.
  const {
    data: summaryStatus,
    isLoading,
    error,
  } = useSummaryStatus(resourceId, sessionIds && sessionIds.length > 0);

  const summaryUpdater = useUpdateSummary();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const { status, setStatus, lastRegisteredEdit, setLastRegisteredEdit } = useUpdateManagerStore();

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [resourceId]);

  const startUpdateNow = useCallback(async () => {
    // Prevent starting if already running globally or if this instance thinks it's started
    if (
      summaryUpdater.isPending ||
      status[resourceId] === RefreshStatus.UpdateStarted
    ) {
      console.debug(`[useSummaryUpdateManager] Update already running for ${resourceId}.`);
      return;
    }

    setStatus(resourceId, RefreshStatus.UpdateStarted);

    console.debug(`[useSummaryUpdateManager] Update triggered for ${resourceId}`);
    try {
      const result = await summaryUpdater.mutateAsync({
        resourceId,
        sessionIds,
      });

      console.debug(`[useSummaryUpdateManager] Update completed for ${resourceId}`);
      return result;
    } catch (error) {
      console.error(
        `[useSummaryUpdateManager] Update failed for ${resourceId}:`,
        error
      );
      throw error;
    } finally {
      setStatus(resourceId, RefreshStatus.UpToDate);
    }
  }, [
    resourceId,
    sessionIds,
    summaryUpdater,
    setStatus,
    status[resourceId],
  ]);

  // Effect to schedule the summary update
  useEffect(() => {
    if (isLoading || !summaryStatus) {
      console.debug(`[useSummaryUpdateManager] No summary status or loading for ${resourceId}`);
      setStatus(resourceId, RefreshStatus.Unknown);
      return; // Do nothing if loading or no summary status
    }

    // Only schedule if no update is currently in progress globally
    if (status[resourceId] === RefreshStatus.UpdateStarted) {
      console.debug(`[useSummaryUpdateManager] Update already started for ${resourceId}`);
      return; // Don't schedule if an update is already running
    }

    if (summaryStatus.lastSummaryUpdate > summaryStatus.lastEdit) {
      setStatus(resourceId, RefreshStatus.UpToDate);
      return;
    }
    
    const delay = 30000; // 30 seconds
    console.debug(
      `[useSummaryUpdateManager] lastRegisteredEdit for ${resourceId}: ${lastRegisteredEdit[resourceId] ?? 0}`
    )
    if (summaryStatus.lastEdit > (lastRegisteredEdit[resourceId] ?? 0)) {
      console.debug(
        `[useSummaryUpdateManager] Registered some edit. Schedule summary update for ${resourceId}.
Last edit:            ${summaryStatus.lastEdit}
Last summary update:  ${summaryStatus.lastSummaryUpdate}`
      );
      
      setLastRegisteredEdit(resourceId, summaryStatus.lastEdit);
      
      // Reset existing timers
      if (timeoutIdRef.current) {
        console.debug(`[useSummaryUpdateManager] Replacing existing timeout for ${resourceId}`);
        clearTimeout(timeoutIdRef.current);
      }

      // Schedule the update
      timeoutIdRef.current = setTimeout(() => {
        startUpdateNow();
      }, delay);
      setStatus(resourceId, RefreshStatus.UpdatePending);
    }
  }, [
    startUpdateNow,
    summaryStatus,
    isLoading,
    resourceId,
    setStatus,
    setLastRegisteredEdit,
  ]);

  return {
    // State
    status: status[resourceId] || RefreshStatus.Unknown,
    isLoading,
    error: error || summaryUpdater.error,

    // Actions to trigger updates manually
    startUpdateNow,
  };
}