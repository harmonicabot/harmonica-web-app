import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCrossPollination } from '../generation';
import type { ClusterInputMessage, SessionContext, ClusterResult } from '../types';

// Mock dependencies
const mockChat = vi.fn();
vi.mock('@/lib/modelConfig', () => ({
  getLLM: vi.fn(() => ({ chat: mockChat })),
}));

vi.mock('../clustering', () => ({
  clusterResponses: vi.fn(),
}));

vi.mock('../quality', () => ({
  validateInsight: vi.fn(),
}));

import { clusterResponses } from '../clustering';
import { validateInsight } from '../quality';
import { ClusterCache } from '../cache';

const mockedClusterResponses = vi.mocked(clusterResponses);
const mockedValidateInsight = vi.mocked(validateInsight);

const sessionContext: SessionContext = {
  topic: 'Remote work policies',
  goal: 'Understand preferences',
};

const clusterResult: ClusterResult = {
  clusters: [
    {
      label: 'Home productivity',
      type: 'convergence',
      messageIds: ['m1', 'm2'],
      summary: 'Participants prefer home for focus.',
      participantCount: 2,
    },
  ],
  totalMessagesAnalyzed: 5,
  timestamp: Date.now(),
};

const allMessages: ClusterInputMessage[] = [
  { id: 'm1', threadId: 't1', content: 'I like working from home', role: 'user' },
  { id: 'm2', threadId: 't2', content: 'Home is more productive', role: 'user' },
  { id: 'm3', threadId: 't3', content: 'What about collaboration?', role: 'user' },
];

const threadMessages = [
  { role: 'user' as const, content: 'I like working from home' },
];

describe('generateCrossPollination', () => {
  let cache: ClusterCache;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new ClusterCache();
  });

  it('should return insight when clustering + generation + quality all succeed', async () => {
    mockedClusterResponses.mockResolvedValue(clusterResult);
    mockChat.mockResolvedValue('Several participants are converging on home productivity. How does this compare to your experience?');
    mockedValidateInsight.mockResolvedValue({ passed: true });

    const result = await generateCrossPollination({
      allMessages,
      threadMessages,
      threadId: 't1',
      sessionId: 's1',
      sessionContext,
      priorInsights: [],
      cache,
    });

    expect(result).not.toBeNull();
    expect(result).toContain('converging');
  });

  it('should return null when quality check fails twice (retry + skip)', async () => {
    mockedClusterResponses.mockResolvedValue(clusterResult);
    mockChat.mockResolvedValue('One participant said they like home.');
    mockedValidateInsight.mockResolvedValue({
      passed: false,
      failedGate: 'cluster_reference',
      reason: 'References individual participant',
    });

    const result = await generateCrossPollination({
      allMessages,
      threadMessages,
      threadId: 't1',
      sessionId: 's1',
      sessionContext,
      priorInsights: [],
      cache,
    });

    expect(result).toBeNull();
    // Should have been called twice (original + retry)
    expect(mockedValidateInsight).toHaveBeenCalledTimes(2);
  });

  it('should use cached clusters when cache is fresh', async () => {
    cache.set('s1', clusterResult, 3);
    mockChat.mockResolvedValue('Group insight about productivity.');
    mockedValidateInsight.mockResolvedValue({ passed: true });

    // 3 messages = same as cached, no re-clustering needed
    await generateCrossPollination({
      allMessages,
      threadMessages,
      threadId: 't1',
      sessionId: 's1',
      sessionContext,
      priorInsights: [],
      cache,
    });

    expect(mockedClusterResponses).not.toHaveBeenCalled();
  });

  it('should re-cluster when cache is stale', async () => {
    // Cached at 0 messages, now 6 = delta 6 >= threshold 5
    const manyMessages: ClusterInputMessage[] = [
      { id: 'm1', threadId: 't1', content: 'Msg 1', role: 'user' },
      { id: 'm2', threadId: 't2', content: 'Msg 2', role: 'user' },
      { id: 'm3', threadId: 't3', content: 'Msg 3', role: 'user' },
      { id: 'm4', threadId: 't4', content: 'Msg 4', role: 'user' },
      { id: 'm5', threadId: 't5', content: 'Msg 5', role: 'user' },
      { id: 'm6', threadId: 't6', content: 'Msg 6', role: 'user' },
    ];
    cache.set('s1', clusterResult, 0); // cached at 0, now 6 = delta 6 >= threshold 5
    mockedClusterResponses.mockResolvedValue(clusterResult);
    mockChat.mockResolvedValue('Group insight.');
    mockedValidateInsight.mockResolvedValue({ passed: true });

    await generateCrossPollination({
      allMessages: manyMessages,
      threadMessages,
      threadId: 't1',
      sessionId: 's1',
      sessionContext,
      priorInsights: [],
      cache,
    });

    expect(mockedClusterResponses).toHaveBeenCalled();
  });

  it('should return null when clustering returns empty clusters', async () => {
    mockedClusterResponses.mockResolvedValue({
      clusters: [],
      totalMessagesAnalyzed: 0,
      timestamp: Date.now(),
    });

    const result = await generateCrossPollination({
      allMessages,
      threadMessages,
      threadId: 't1',
      sessionId: 's1',
      sessionContext,
      priorInsights: [],
      cache,
    });

    expect(result).toBeNull();
  });
});
