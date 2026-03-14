import { describe, it, expect, beforeEach } from 'vitest';
import { ClusterCache } from '../cache';
import type { ClusterResult } from '../types';

const makeClusterResult = (clusterCount: number, messageCount: number): ClusterResult => ({
  clusters: Array.from({ length: clusterCount }, (_, i) => ({
    label: `Cluster ${i}`,
    type: 'convergence' as const,
    messageIds: [`m${i}`],
    summary: `Summary ${i}`,
    participantCount: 1,
  })),
  totalMessagesAnalyzed: messageCount,
  timestamp: Date.now(),
});

describe('ClusterCache', () => {
  let cache: ClusterCache;

  beforeEach(() => {
    cache = new ClusterCache();
  });

  it('should return null for uncached session', () => {
    expect(cache.get('session-1')).toBeNull();
  });

  it('should store and retrieve cluster results', () => {
    const result = makeClusterResult(2, 5);
    cache.set('session-1', result, 5);

    const cached = cache.get('session-1');
    expect(cached).not.toBeNull();
    expect(cached!.clusterResult.clusters).toHaveLength(2);
    expect(cached!.messageCountAtClustering).toBe(5);
  });

  it('should report needsUpdate when message delta exceeds threshold', () => {
    const result = makeClusterResult(2, 5);
    cache.set('session-1', result, 5);

    // 5 messages at clustering + 5 new = 10 total, delta = 5 >= threshold (5)
    expect(cache.needsUpdate('session-1', 10)).toBe(true);
  });

  it('should not report needsUpdate when delta is below threshold', () => {
    const result = makeClusterResult(2, 5);
    cache.set('session-1', result, 5);

    // 5 messages at clustering + 3 new = 8 total, delta = 3 < threshold (5)
    expect(cache.needsUpdate('session-1', 8)).toBe(false);
  });

  it('should report needsUpdate for uncached sessions', () => {
    expect(cache.needsUpdate('unknown', 10)).toBe(true);
  });

  it('should evict a session', () => {
    const result = makeClusterResult(2, 5);
    cache.set('session-1', result, 5);
    cache.evict('session-1');

    expect(cache.get('session-1')).toBeNull();
  });
});
