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
  timeouts: Record<string, NodeJS.Timeout | null>;
  // Add actions to update status
  setStatus: (resourceId: string, status: RefreshStatus) => void;
  setLastRegisteredEdit: (resourceId: string, lastEdit: number) => void;
  // Centralized scheduling method that prevents race conditions
  scheduleUpdateIfNeeded: (
    resourceId: string,
    summaryStatus: { lastEdit: number; lastSummaryUpdate: number },
    startUpdateCallback: () => Promise<any>
  ) => boolean;
  clearTimeout: (resourceId: string) => void;
}

const useUpdateManagerStore = create<UpdateManagerStore>((set, get) => ({
  status: {},
  lastRegisteredEdit: {},
  timeouts: {},

  setStatus: (resourceId, status) =>
    set((state) => {
      if (state.status[resourceId] === status) return state; // No change if status is the same; necessary to prevent infinite rerender loops
      return {
        status: { ...state.status, [resourceId]: status },
      };
    }),

  setLastRegisteredEdit: (resourceId, lastEdit) =>
    set((state) => ({
      lastRegisteredEdit: {
        ...state.lastRegisteredEdit,
        [resourceId]: lastEdit,
      },
    })),

  clearTimeout: (resourceId) => {
    const state = get();
    const timeoutId = state.timeouts[resourceId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      set((state) => ({
        timeouts: { ...state.timeouts, [resourceId]: null },
      }));
    }
  },

  scheduleUpdateIfNeeded: (resourceId, summaryStatus, startUpdateCallback) => {
    const state = get();

    // Check if summary is already up to date
    if (summaryStatus.lastSummaryUpdate > summaryStatus.lastEdit) {
      set((currentState) => ({
        status: {
          ...currentState.status,
          [resourceId]: RefreshStatus.UpToDate,
        },
      }));
      return false;
    }

    // Only schedule if no update is currently in progress
    if (state.status[resourceId] === RefreshStatus.UpdateStarted) {
      return false;
    }

    // Check if we've already registered this edit
    const lastRegistered = state.lastRegisteredEdit[resourceId] ?? 0;
    if (summaryStatus.lastEdit <= lastRegistered) {
      return false;
    }

    // Update the last registered edit timestamp
    set((currentState) => ({
      lastRegisteredEdit: {
        ...currentState.lastRegisteredEdit,
        [resourceId]: summaryStatus.lastEdit,
      },
    }));

    // Clear any existing timeout
    const existingTimeout = state.timeouts[resourceId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule the update
    const delay = 30000; // 30 seconds
    const timeoutId = setTimeout(async () => {

      // Double-check that we should still proceed
      const currentState = get();
      if (currentState.status[resourceId] === RefreshStatus.UpdateStarted) {
        return;
      }

      // Set status to started before calling the update
      set((state) => ({
        status: { ...state.status, [resourceId]: RefreshStatus.UpdateStarted },
        timeouts: { ...state.timeouts, [resourceId]: null },
      }));

      try {
        await startUpdateCallback();
        set((state) => ({
          status: { ...state.status, [resourceId]: RefreshStatus.UpToDate },
        }));
      } catch (error) {
        console.error(
          `[UpdateManagerStore] Update failed for ${resourceId}:`,
          error
        );
        set((state) => ({
          status: { ...state.status, [resourceId]: RefreshStatus.Outdated },
        }));
      }
    }, delay);

    // Store the timeout reference
    set((currentState) => ({
      status: {
        ...currentState.status,
        [resourceId]: RefreshStatus.UpdatePending,
      },
      timeouts: { ...currentState.timeouts, [resourceId]: timeoutId },
    }));

    return true;
  },
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
  const {
    status,
    scheduleUpdateIfNeeded,
    clearTimeout: clearStoreTimeout,
  } = useUpdateManagerStore();

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      clearStoreTimeout(resourceId);
    };
  }, [resourceId, clearStoreTimeout]);

  const startUpdateNow = useCallback(async () => {
    // Get current status from store at runtime
    const currentStatus = useUpdateManagerStore.getState().status[resourceId];
    
    // Prevent starting if already running globally
    if (
      summaryUpdater.isPending ||
      currentStatus === RefreshStatus.UpdateStarted
    ) {
      return;
    }
    try {
      const result = await summaryUpdater.mutateAsync({
        resourceId,
        sessionIds,
      });
      return result;
    } catch (error) {
      console.error(
        `[useSummaryUpdateManager] Update failed for ${resourceId}:`,
        error
      );
      throw error;
    }
  }, [resourceId, sessionIds, summaryUpdater]);

  // Effect to schedule the summary update using centralized logic
  useEffect(() => {
    if (isLoading || !summaryStatus) {
      return; // Do nothing if loading or no summary status
    }

    // Use the centralized scheduler that prevents race conditions
    scheduleUpdateIfNeeded(resourceId, summaryStatus, startUpdateNow);
  }, [
    summaryStatus,
    isLoading,
    resourceId,
    // Don't include scheduleUpdateIfNeeded - it's not stable and causes infinite loops
    startUpdateNow,
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
