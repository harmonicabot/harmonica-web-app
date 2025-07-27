import { createSummary, createMultiSessionSummary } from '@/lib/serverUtils';
import { checkSummaryNeedsUpdating } from '@/lib/summaryActions';
import { updateUserLastEdit, updateHostLastEdit } from '@/lib/summaryActions';
import { mutate } from 'swr';

export enum RefreshStatus {
  Unknown,
  Outdated,
  UpdatePending,
  UpToDate,
}

interface UpdateState {
  isRunning: boolean;
  lastEditTimestamp?: number;
  status: RefreshStatus;
  version?: { lastEdit: number; lastSummaryUpdate: number };
  pollingIntervalId?: NodeJS.Timeout;
  listeners: Set<(state: UpdateState) => void>;
}

export interface ManagerOpts {
  isProject?: boolean;
  sessionIds?: string[];
  projectId?: string;
  // Check: Needed?
  source?: 'participants' | 'chat' | 'ui' | 'auto';
  userSessionId?: string;
}

class SummaryUpdateManagerClass {
  private updates = new Map<string, UpdateState>();

  startPolling(resourceId: string, interval = 10000) {
    this.stopPolling(resourceId); // Ensure no duplicate intervals
    console.log("Start polling for", resourceId);
    const poll = async () => {
      console.log(`[SummaryUpdateManager] Polling for ${resourceId}`);
      this.handleUpdateTimes(resourceId);
    };

    poll(); // Initial poll

    const intervalId = setInterval(poll, interval);
    this.getOrCreateState(resourceId).pollingIntervalId = intervalId;
  }

  stopPolling(resourceId: string) {
    const state = this.updates.get(resourceId);
    if (state?.pollingIntervalId) {
      clearInterval(state.pollingIntervalId);
      state.pollingIntervalId = undefined;
      console.log("Stopped polling for", resourceId);
    }
  }

  // --- Status and version logic ---
  private getOrCreateState(resourceId: string): UpdateState {
    if (!this.updates.has(resourceId)) {
      this.updates.set(resourceId, {
        isRunning: false,
        status: RefreshStatus.Unknown,
        listeners: new Set(),
      });
    }
    return this.updates.get(resourceId)!;
  }

  private async handleUpdateTimes(resourceId: string) {
    const state = this.getOrCreateState(resourceId);
    try {
      const updateTimes = await checkSummaryNeedsUpdating(resourceId);
    
      const delay = 30000;
      if (updateTimes.lastEdit > updateTimes.lastSummaryUpdate) {
        console.log(`[SummaryUpdateManager] Update needed for ${resourceId}`);
        state.status = RefreshStatus.UpdatePending;
        if (Date.now() - updateTimes.lastEdit > delay && !state.isRunning) {
          console.log(`[SummaryUpdateManager] Triggering update for ${resourceId} (30s delay has passed...)`);
          this.updateNow(resourceId, { source: 'auto' });
          state.lastEditTimestamp = updateTimes.lastEdit;
        }
      } else {
        state.status = RefreshStatus.UpToDate;
      }
    } catch (error) {
      console.error('Failed to check update times:', error);
    }
    this.notify(resourceId);
  }

  // --- Listener logic for React hook ---
  subscribe(resourceId: string, listener: (state: UpdateState) => void) {
    this.getOrCreateState(resourceId).listeners.add(listener);
    return () => this.getOrCreateState(resourceId).listeners.delete(listener);
  }

  private notify(resourceId: string, message?: string) {
    const state = this.updates.get(resourceId);
    if (state) {
      if (message) {
        console.log(`[SummaryUpdateManager] Notifying listeners for ${resourceId}: ${message}`);
      }
      state.listeners.forEach((fn) => fn(state));
    }
  }

  /**
   * Execute summary update now
   */
  async updateNow(resourceId: string, opts: ManagerOpts = {}): Promise<string | undefined> {
    const state = this.getOrCreateState(resourceId);
    if (state.isRunning) {
      console.log(`[SummaryUpdateManager] Update already running for ${resourceId}`);
      return;
    }
    state.isRunning = true;
    this.notify(resourceId, "Update started");

    try {
      console.log(`[SummaryUpdateManager] Executing update for ${resourceId}`, opts);
      
      let summary: string;
      if (opts.isProject) {
        summary = await createMultiSessionSummary(
          opts.sessionIds?.length ? opts.sessionIds : [resourceId],
          opts.projectId ?? resourceId
        );
      } else {
        summary = await createSummary(resourceId);
      }

      // Update SWR cache with new summary content and invalidate version cache
      mutate(['summary-content', resourceId], summary, false);
      mutate(key => 
        typeof key === 'string' && 
        (key.includes('summary-version') || key.includes(resourceId))
      );

      console.log(`[SummaryUpdateManager] Update completed for ${resourceId}`);
      return summary;
      
    } catch (error) {
      console.error(`[SummaryUpdateManager] Update failed for ${resourceId}:`, error);
    } finally {
      // Clean up state
      state.isRunning = false;
      state.status = RefreshStatus.UpToDate;
      this.notify(resourceId, "Update finished");
    }
  }

  getState(resourceId: string): UpdateState {
    return this.getOrCreateState(resourceId);
  }

  clearState(resourceId: string): void {
    this.stopPolling(resourceId);
    this.updates.delete(resourceId);
  }
}

// Export singleton instance
export const SummaryUpdateManager = new SummaryUpdateManagerClass();
