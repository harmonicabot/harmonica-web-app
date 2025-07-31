/**
 * @file This file defines the SummaryUpdateManager singleton class,
 * responsible for centralizing and debouncing summary update logic.
 * It manages the status, timeouts, and last edit timestamps for each resource,
 * and provides a subscription mechanism for React components.
 */

export enum RefreshStatus {
  Unknown = 'Unknown',
  Outdated = 'Outdated',
  UpdatePending = 'UpdatePending',
  UpdateStarted = 'UpdateStarted',
  UpToDate = 'UpToDate',
}

interface SummaryStatusData {
  lastEdit: number;
  lastSummaryUpdate: number;
}

type StatusUpdateCallback = (status: RefreshStatus) => void;

/**
 * SummaryUpdateManager is a singleton class that handles the debounced
 * scheduling and execution of summary updates for various resources.
 * It ensures that only one update is pending or in progress for a given resource
 * and provides a mechanism for UI components to react to status changes.
 */
class SummaryUpdateManagerClass {
  private static instance: SummaryUpdateManagerClass;

  // Stores the current RefreshStatus for each resourceId
  private statuses: Map<string, RefreshStatus> = new Map();
  // Stores the NodeJS.Timeout ID for pending debounced updates
  private scheduledUpdates: Map<string, NodeJS.Timeout> = new Map();
  // Stores the timestamp of the last edit that was registered for a potential update
  private lastRegisteredEdits: Map<string, number> = new Map();
  // Stores sets of callback functions subscribed to status changes for each resourceId
  private subscribers: Map<string, Set<StatusUpdateCallback>> = new Map();

  /**
   * Private constructor to enforce the singleton pattern.
   */
  private constructor() { }

  /**
   * Returns the single instance of the SummaryUpdateManager.
   * @returns The singleton instance of SummaryUpdateManagerClass.
   */
  public static getInstance(): SummaryUpdateManagerClass {
    if (!SummaryUpdateManagerClass.instance) {
      SummaryUpdateManagerClass.instance = new SummaryUpdateManagerClass();
    }
    return SummaryUpdateManagerClass.instance;
  }

  /**
   * Internal method to update the status of a resource and notify all its subscribers.
   * @param resourceId The ID of the resource.
   * @param status The new RefreshStatus for the resource.
   */
  private setStatus(resourceId: string, status: RefreshStatus): void {
    // Only update and notify if the status has actually changed
    if (this.statuses.get(resourceId) === status) {
      return;
    }
    this.statuses.set(resourceId, status);
    this.notifySubscribers(resourceId, status);
  }

  /**
   * Notifies all registered callback functions for a specific resourceId with its current status.
   * @param resourceId The ID of the resource.
   * @param status The current RefreshStatus of the resource.
   */
  private notifySubscribers(resourceId: string, status: RefreshStatus): void {
    const callbacks = this.subscribers.get(resourceId);
    if (callbacks) {
      // Use a new Set to avoid issues if subscribers unsubscribe during iteration
      new Set(callbacks).forEach(callback => {
        try {
          callback(status);
        } catch (e) {
          console.error(`[SummaryUpdateManager] Error notifying subscriber for ${resourceId}:`, e);
        }
      });
    }
  }

  /**
   * Subscribes a callback function to status updates for a given resourceId.
   * @param resourceId The ID of the resource.
   * @param callback The function to be called when the resource's status changes.
   * @returns A function to unsubscribe the callback.
   */
  public subscribe(resourceId: string, callback: StatusUpdateCallback): () => void {
    if (!this.subscribers.has(resourceId)) {
      this.subscribers.set(resourceId, new Set());
    }
    this.subscribers.get(resourceId)?.add(callback);

    // Immediately provide the current status to the new subscriber
    callback(this.getStatus(resourceId));

    // Return an unsubscribe function for cleanup
    return () => {
      const callbacks = this.subscribers.get(resourceId);
      if (callbacks) {
        callbacks.delete(callback);
        // Clean up the Set if no more subscribers for this resource
        if (callbacks.size === 0) {
          this.subscribers.delete(resourceId);
        }
      }
    };
  }

  /**
   * Retrieves the current RefreshStatus for a given resourceId.
   * @param resourceId The ID of the resource.
   * @returns The current RefreshStatus, or Unknown if not found.
   */
  public getStatus(resourceId: string): RefreshStatus {
    return this.statuses.get(resourceId) || RefreshStatus.Unknown;
  }

  /**
   * Clears any pending debounce timeout for a specific resourceId.
   * @param resourceId The ID of the resource.
   */
  private clearScheduledUpdate(resourceId: string): void {
    const timeoutId = this.scheduledUpdates.get(resourceId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledUpdates.delete(resourceId);
    }
  }

  /**
   * Schedules a summary update for a resource with a 30-second debounce.
   * This method should be called whenever a potential change is detected (e.g., lastEdit timestamp changes).
   * It will only trigger an actual update after 30 seconds of inactivity for that resource.
   * @param resourceId The ID of the resource (e.g., session or workspace).
   * @param summaryStatus The current summary status data (lastEdit, lastSummaryUpdate).
   * @param startUpdateCallback A function that, when called, initiates the actual summary update (e.g., a TanStack Query mutation).
   */
  public scheduleUpdate(
    resourceId: string,
    summaryStatus: SummaryStatusData,
    startUpdateCallback: () => Promise<any>
  ): void {
    // 1. Guard: If summary is already up to date, clear any pending updates and set status.
    if (summaryStatus.lastSummaryUpdate >= summaryStatus.lastEdit) {
      this.setStatus(resourceId, RefreshStatus.UpToDate);
      this.clearScheduledUpdate(resourceId); // Ensure no pending updates
      return;
    }

    // 2. Guard: If an update is currently in progress, do not schedule another.
    if (this.getStatus(resourceId) === RefreshStatus.UpdateStarted) {
      return;
    }

    // 3. Guard: Check if we've already registered this specific edit.
    // This prevents re-scheduling if the lastEdit hasn't genuinely advanced since last check.
    const lastRegistered = this.lastRegisteredEdits.get(resourceId) ?? 0;
    if (summaryStatus.lastEdit <= lastRegistered) {
      return;
    }

    // Update the last registered edit timestamp to the current lastEdit
    this.lastRegisteredEdits.set(resourceId, summaryStatus.lastEdit);

    // Clear any existing debounce timeout for this resource to reset the timer
    this.clearScheduledUpdate(resourceId);

    // Set status to pending as an update is now scheduled
    this.setStatus(resourceId, RefreshStatus.UpdatePending);

    const debounceDelayMs = 30000; // 30 seconds debounce delay

    // Schedule the actual update after the debounce delay
    const scheduleId = setTimeout(async () => {
      this.startUpdateNow(resourceId, startUpdateCallback)
    }, debounceDelayMs);

    // Store the new timeout ID
    this.scheduledUpdates.set(resourceId, scheduleId);
  }

  /**
   * Manually triggers a summary update for a resource, bypassing the debounce delay.
   * @param resourceId The ID of the resource.
   * @param startUpdateCallback A function that initiates the actual summary update.
   * @returns A Promise that resolves when the update is complete, or rejects if it fails.
   */
  public async startUpdateNow(resourceId: string, startUpdateCallback: () => Promise<any>): Promise<void> {
    // Clear any pending debounced update for this resource
    this.clearScheduledUpdate(resourceId);

    // Guard: Prevent starting if an update is already running
    if (this.getStatus(resourceId) === RefreshStatus.UpdateStarted) {
      console.warn(`[SummaryUpdateManager] Manual update for ${resourceId} aborted: already running.`);
      return;
    }

    // Set status to 'UpdateStarted'
    this.setStatus(resourceId, RefreshStatus.UpdateStarted);

    try {
      await startUpdateCallback(); // Execute the actual update
      this.setStatus(resourceId, RefreshStatus.UpToDate);
      // Mark as updated to prevent immediate re-trigger from debouncer
      this.lastRegisteredEdits.set(resourceId, Date.now());
    } catch (error) {
      console.error(
        `[SummaryUpdateManager] Manual update failed for ${resourceId}:`,
        error
      );
      this.setStatus(resourceId, RefreshStatus.Outdated);
      throw error; // Re-throw to allow the calling component to handle the error
    }
  }

  /**
   * Cleans up all state associated with a specific resourceId.
   * This should be called when a resource is no longer active or mounted in the application.
   * @param resourceId The ID of the resource to clean up.
   */
  public cleanup(resourceId: string): void {
    this.clearScheduledUpdate(resourceId); // Clear any pending timeouts
    this.statuses.delete(resourceId);
    this.lastRegisteredEdits.delete(resourceId);
    this.subscribers.delete(resourceId); // Remove all subscribers for this resource
    console.log(`[SummaryUpdateManager] Cleaned up state for ${resourceId}`);
  }
}

// Export the singleton instance for global access
export const summaryUpdateManager = SummaryUpdateManagerClass.getInstance();