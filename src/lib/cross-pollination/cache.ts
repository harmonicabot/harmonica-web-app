import type { ClusterResult } from './types';

const RECLUSTER_THRESHOLD = 5; // Re-cluster after this many new messages

interface CacheEntry {
  clusterResult: ClusterResult;
  messageCountAtClustering: number;
}

/**
 * In-memory cache for cluster results, keyed by session ID.
 * Must be instantiated as a module-level singleton (CrossPollinationManager
 * is instantiated per-request, so cache must live outside it).
 */
export class ClusterCache {
  private cache = new Map<string, CacheEntry>();

  get(sessionId: string): CacheEntry | null {
    return this.cache.get(sessionId) ?? null;
  }

  set(sessionId: string, clusterResult: ClusterResult, messageCount: number): void {
    this.cache.set(sessionId, { clusterResult, messageCountAtClustering: messageCount });
  }

  /**
   * Returns true if clustering should re-run for this session.
   * True when: no cache exists, or enough new messages since last clustering.
   */
  needsUpdate(sessionId: string, currentMessageCount: number): boolean {
    const entry = this.cache.get(sessionId);
    if (!entry) return true;
    return currentMessageCount - entry.messageCountAtClustering >= RECLUSTER_THRESHOLD;
  }

  evict(sessionId: string): void {
    this.cache.delete(sessionId);
  }
}
