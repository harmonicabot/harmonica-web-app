import { createSummary, createMultiSessionSummary } from '@/lib/serverUtils';
import { checkSummaryNeedsUpdating } from '@/lib/summaryActions';
import { mutate } from 'swr';

export interface ManagerOpts {
  isProject?: boolean;
  sessionIds?: string[];
  projectId?: string;
  // Check: Needed?
  source?: 'participants' | 'chat' | 'ui' | 'auto';
  userSessionId?: string;
}

interface UpdateState {
  isRunning: boolean;
  lastEditTimestamp?: number;
}

class SummaryUpdateManagerClass {
  private updates = new Map<string, UpdateState>();

  /**
   * Marks a resource as having new edits by updating the appropriate timestamp
   */
  async registerEdit(resourceId: string, opts: ManagerOpts = {}): Promise<void> {
    try {
      const { source = 'ui', userSessionId } = opts;
      
      if (source === 'participants' && userSessionId) {
        const { updateUserLastEdit } = await import('@/lib/summaryActions');
        await updateUserLastEdit(userSessionId);
      } else {
        const { updateHostLastEdit } = await import('@/lib/summaryActions');
        await updateHostLastEdit(resourceId);
      }
      
      // Update local state (for UI loading state management)
      const existing = this.updates.get(resourceId) || { isRunning: false };
      existing.lastEditTimestamp = Date.now();
      this.updates.set(resourceId, existing);
      
      console.log(`[SummaryUpdateManager] Registered edit for ${resourceId} (source: ${source})`);
    } catch (error) {
      console.error('Failed to register edit:', error);
    }
  }

  /**
   * Execute summary update immediately
   */
  async updateNow(resourceId: string, opts: ManagerOpts = {}): Promise<void> {
    const state = this.updates.get(resourceId);
    if (state?.isRunning) {
      console.log(`[SummaryUpdateManager] Update already running for ${resourceId}`);
      return;
    }

    // Mark as running
    this.updates.set(resourceId, { isRunning: true });

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
      this.updates.delete(resourceId);
    }
  }

  /**
   * Check if a resource needs a summary update based on timestamps
   */
  async needsUpdate(resourceId: string, isProject = false): Promise<boolean> {
    try {
      const version = await checkSummaryNeedsUpdating(resourceId, isProject);

      return version.lastEdit > version.lastSummaryUpdate;
    } catch (error) {
      console.error('Failed to check if update needed:', error);
      return false;
    }
  }

  /**
   * Get current state for UI
   */
  getState(resourceId: string): { isRunning: boolean; lastEditTimestamp?: number } {
    const state = this.updates.get(resourceId);
    return {
      isRunning: state?.isRunning || false,
      lastEditTimestamp: state?.lastEditTimestamp
    };
  }

  /**
   * Clear any local state (useful for cleanup)
   */
  clearState(resourceId: string): void {
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
    needsUpdate: () => SummaryUpdateManager.needsUpdate(resourceId, opts.isProject),
    getState: () => SummaryUpdateManager.getState(resourceId),
    clearState: () => SummaryUpdateManager.clearState(resourceId)
  };
}
