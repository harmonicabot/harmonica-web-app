'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSummaryStatus, useUpdateSummary } from '@/stores/SessionStore';
// Import the singleton instance and its RefreshStatus enum
import { summaryUpdateManager, RefreshStatus } from '@/lib/summary-update-manager';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient for potential invalidation

/**
 * A React hook to manage the status and triggering of summary updates for a given resource.
 * It integrates with the global SummaryUpdateManager singleton for debounced updates
 * and provides status feedback to components.
 *
 * @param resourceId The unique identifier for the resource (e.g., session ID, workspace ID).
 * @param sessionIds Optional array of session IDs if the resource is a project/workspace.
 * @returns An object containing the current refresh status, loading state, error, and a function to trigger an update immediately.
 */
export function useSummaryUpdateManager(
  resourceId: string,
  sessionIds?: string[] // Provided for projects
) {
  const queryClient = useQueryClient(); // Get query client for potential invalidation

  // Use TanStack Query to fetch the summary status (lastEdit, lastSummaryUpdate)
  // This is the primary source of truth for detecting if an update is needed.
  const {
    data: summaryStatus,
    isLoading: isSummaryStatusLoading,
    error: summaryStatusError,
  } = useSummaryStatus(resourceId, sessionIds && sessionIds.length > 0);

  // TanStack Query mutation hook for performing the actual summary update
  const summaryUpdater = useUpdateSummary();

  // Local React state to reflect the RefreshStatus from the singleton.
  // This ensures the component re-renders when the status changes.
  const [currentStatus, setCurrentStatus] = useState<RefreshStatus>(
    summaryUpdateManager.getStatus(resourceId)
  );

  /**
   * Effect to subscribe to status changes from the SummaryUpdateManager singleton.
   * The callback updates the local React state, causing component re-renders.
   */
  useEffect(() => {
    const unsubscribe = summaryUpdateManager.subscribe(resourceId, (status) => {
      setCurrentStatus(status);
    });

    // Cleanup function: unsubscribe when the component unmounts or resourceId changes.
    // Optionally, you might call summaryUpdateManager.cleanup(resourceId) here
    // if this hook instance is the definitive lifecycle owner for this resourceId.
    // However, if multiple components might use the same resourceId,
    // cleanup should be managed at a higher level (e.g., when the resource is truly deleted).
    return () => {
      unsubscribe();
    };
  }, [resourceId]); // Re-subscribe if resourceId changes

  /**
   * Callback function that performs the actual summary update via TanStack Query mutation.
   * This function is passed to the singleton, so it can execute the update when needed.
   */
  const startUpdateMutation = useCallback(async () => {
    try {
      const result = await summaryUpdater.mutateAsync({
        resourceId,
        sessionIds,
      });
      // After a successful update, invalidate the summary status query
      // to ensure the latest lastSummaryUpdate timestamp is fetched.
      console.log(`Update successful, invalidating summary stats`)
      await queryClient.invalidateQueries({ queryKey: ['summary-status', resourceId] });
      return result;
    } catch (error) {
      console.error(`[useSummaryUpdateManager] Mutation failed for ${resourceId}:`, error);
      throw error; // Re-throw to allow singleton to handle status
    }
  }, [resourceId, sessionIds, summaryUpdater, queryClient]);

  /**
   * Effect to trigger the singleton's scheduleUpdate method.
   * This runs whenever `summaryStatus` data changes (indicating a potential edit)
   * or when the hook's dependencies change.
   */
  useEffect(() => {
    // Guard: Do not schedule if summary status data is still loading or not available.
    if (isSummaryStatusLoading || !summaryStatus) {
      return;
    }

    // Pass the current summary status data and the mutation callback to the singleton.
    // The singleton will handle the debouncing and actual update scheduling.
    summaryUpdateManager.scheduleUpdate(resourceId, summaryStatus, startUpdateMutation);
  }, [
    summaryStatus, // Trigger when lastEdit or lastSummaryUpdate changes
    isSummaryStatusLoading,
    resourceId,
    startUpdateMutation, // Ensure the latest callback is used
  ]);

  /**
   * Function to manually trigger a summary update immediately, bypassing the debounce.
   * This is typically called by a UI action (e.g., a "Refresh" button).
   */
  const startUpdateNow = useCallback(async () => {
    try {
      // Delegate the immediate update logic to the singleton.
      await summaryUpdateManager.startUpdateNow(resourceId, startUpdateMutation);
    } catch (err) {
      // Error is already logged by the singleton, re-throw if the component needs to catch it.
      throw err;
    }
  }, [resourceId, startUpdateMutation]);

  return {
    // The current refresh status, synchronized from the singleton.
    status: currentStatus,
    // Loading state for the initial summary status query.
    isLoading: isSummaryStatusLoading,
    // Combined error from summary status query or the update mutation.
    error: summaryStatusError || summaryUpdater.error,
    // Function to manually trigger an update.
    startUpdateNow,
  };
}