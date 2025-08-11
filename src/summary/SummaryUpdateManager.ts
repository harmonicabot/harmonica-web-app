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
        console.log(`[SummaryUpdateManager] No update needed for ${resourceId}`);
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

  private notify(resourceId: string) {
    const state = this.updates.get(resourceId);
    if (state) {
      state.listeners.forEach((fn) => fn(state));
    }
  }

  /**
   * Marks a resource as having new edits by updating the appropriate timestamp
   */
  async registerEdit(resourceId: string, opts: ManagerOpts = {}): Promise<void> {
    try {
      const { source = 'ui', userSessionId } = opts;
      const state = this.getOrCreateState(resourceId);
      state.status = RefreshStatus.Outdated;
      
      if (source === 'participants' && userSessionId) {
        await updateUserLastEdit(userSessionId);
      } else {
        await updateHostLastEdit(resourceId);
      }
      
      state.lastEditTimestamp = Date.now(); // Do this after we've updated, just in case it fails
      console.log(`[SummaryUpdateManager] Registered edit for ${resourceId} (source: ${source})`);
    } catch (error) {
      console.error('Failed to register edit:', error);
    }
  }

  /**
   * Execute summary update now
   */
  async updateNow(resourceId: string, opts: ManagerOpts = {}): Promise<void> {
    const state = this.getOrCreateState(resourceId);
    if (state.isRunning) {
      console.log(`[SummaryUpdateManager] Update already running for ${resourceId}`);
      return;
    }
    state.isRunning = true;
    this.notify(resourceId);

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
      
    } catch (error) {
      console.error(`[SummaryUpdateManager] Update failed for ${resourceId}:`, error);
    } finally {
      // Clean up state
      state.isRunning = false;
      state.status = RefreshStatus.UpToDate;
      this.notify(resourceId);
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

// React hook for convenient access
export function useSummaryUpdate(resourceId: string, opts: ManagerOpts = {}) {
  return {
    registerEdit: () => SummaryUpdateManager.registerEdit(resourceId, opts),
    updateNow: () => SummaryUpdateManager.updateNow(resourceId, opts),
    getState: () => SummaryUpdateManager.getState(resourceId),
    clearState: () => SummaryUpdateManager.clearState(resourceId)
  };
}
