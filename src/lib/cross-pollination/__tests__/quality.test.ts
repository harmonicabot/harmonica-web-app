import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateInsight } from '../quality';
import type { ClusterResult } from '../types';

const mockChat = vi.fn();
vi.mock('@/lib/modelConfig', () => ({
  getLLM: vi.fn(() => ({ chat: mockChat })),
}));

const clusterResult: ClusterResult = {
  clusters: [
    {
      label: 'Privacy concerns',
      type: 'convergence',
      messageIds: ['m1', 'm2'],
      summary: 'Multiple participants worry about data privacy.',
      participantCount: 2,
    },
  ],
  totalMessagesAnalyzed: 5,
  timestamp: Date.now(),
};

const threadMessages = [
  { role: 'user' as const, content: 'I think data privacy is the biggest concern' },
  { role: 'assistant' as const, content: 'That is an important point about privacy.' },
];

describe('validateInsight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Gate 1: Length
  it('should fail insights shorter than 50 characters', async () => {
    const result = await validateInsight('Too short', clusterResult, [], threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('length');
  });

  it('should pass insights longer than 50 characters (if other gates pass)', async () => {
    const insight = 'Several participants are converging on privacy concerns around data sharing, which connects to your point about data protection.';
    mockChat.mockResolvedValue('PASS — insight is novel');

    const result = await validateInsight(insight, clusterResult, [], threadMessages);
    expect(result.failedGate).not.toBe('length');
  });

  // Gate 2: Cluster reference (deterministic)
  it('should fail insights that reference individual participants', async () => {
    const insight = 'One participant said they prefer working from home because of fewer distractions, which is interesting compared to your view.';
    const result = await validateInsight(insight, clusterResult, [], threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('cluster_reference');
  });

  it('should fail insights with "a participant mentioned" pattern', async () => {
    const insight = 'A participant mentioned that privacy is key. This connects to broader themes about data governance in the session.';
    const result = await validateInsight(insight, clusterResult, [], threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('cluster_reference');
  });

  it('should fail if cluster result is empty', async () => {
    const emptyCluster: ClusterResult = { clusters: [], totalMessagesAnalyzed: 0, timestamp: Date.now() };
    const insight = 'Several participants are converging on privacy concerns, which aligns with your thinking about data protection.';
    const result = await validateInsight(insight, emptyCluster, [], threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('cluster_reference');
  });

  // Gate 3: Novelty (LLM)
  it('should fail insights that repeat prior insights', async () => {
    const insight = 'Several participants are converging on privacy concerns around data sharing, which connects to your point about data protection.';
    const priorInsights = ['The group is showing strong agreement on privacy and data protection themes.'];
    mockChat.mockResolvedValue('FAIL — repeats the same privacy theme as prior insight');

    const result = await validateInsight(insight, clusterResult, priorInsights, threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('novelty');
  });

  // Gate 4: Relevance (LLM)
  it('should fail insights not connected to thread', async () => {
    const insight = 'Several participants are exploring innovative pricing models for the platform, with creative ideas about freemium tiers.';
    const priorInsights = ['Some prior insight about a different topic.'];
    // First LLM call (novelty) passes, second (relevance) fails
    mockChat
      .mockResolvedValueOnce('PASS — novel insight')
      .mockResolvedValueOnce('FAIL — not connected to participant discussion about privacy');

    const result = await validateInsight(insight, clusterResult, priorInsights, threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('relevance');
  });

  // Happy path — with prior insights (exercises all 4 gates)
  it('should pass a good insight through all gates', async () => {
    const insight = 'Several participants are converging on privacy concerns around data sharing, which connects to your point about data protection. How do you think organizations should balance transparency with privacy?';
    const priorInsights = ['An earlier insight about collaboration preferences.'];
    mockChat
      .mockResolvedValueOnce('PASS — novel insight')
      .mockResolvedValueOnce('PASS — connects to participant privacy discussion');

    const result = await validateInsight(insight, clusterResult, priorInsights, threadMessages);
    expect(result.passed).toBe(true);
    expect(result.failedGate).toBeUndefined();
  });

  // Error handling
  it('should fail gracefully if LLM throws during novelty check', async () => {
    const insight = 'Several participants are converging on privacy concerns, with interesting perspectives on how regulation shapes their views.';
    const priorInsights = ['Some prior insight about a different topic.'];
    mockChat.mockRejectedValue(new Error('LLM timeout'));

    const result = await validateInsight(insight, clusterResult, priorInsights, threadMessages);
    expect(result.passed).toBe(false);
    expect(result.failedGate).toBe('novelty');
  });
});
