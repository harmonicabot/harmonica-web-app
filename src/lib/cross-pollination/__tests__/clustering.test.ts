import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clusterResponses } from '../clustering';
import type { ClusterInputMessage, SessionContext, ClusterResult } from '../types';

// Mock the LLM — clustering calls getLLM('MAIN', 0.3)
const mockChat = vi.fn();
vi.mock('@/lib/modelConfig', () => ({
  getLLM: vi.fn(() => ({ chat: mockChat })),
}));

const sessionContext: SessionContext = {
  topic: 'Remote work policies',
  goal: 'Understand employee preferences for hybrid work',
};

const makeMessage = (id: string, threadId: string, content: string): ClusterInputMessage => ({
  id,
  threadId,
  content,
  role: 'user',
});

describe('clusterResponses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return parsed ClusterResult from LLM response', async () => {
    const messages: ClusterInputMessage[] = [
      makeMessage('m1', 't1', 'I prefer working from home for focus time'),
      makeMessage('m2', 't2', 'I also find home more productive'),
      makeMessage('m3', 't3', 'I miss the office for collaboration'),
    ];

    const mockClusterResult: ClusterResult = {
      clusters: [
        {
          label: 'Home productivity preference',
          type: 'convergence',
          messageIds: ['m1', 'm2'],
          summary: 'Multiple participants find working from home more productive for focused work.',
          participantCount: 2,
        },
        {
          label: 'Office collaboration value',
          type: 'tension',
          messageIds: ['m3'],
          summary: 'Some participants miss in-person collaboration that the office provides.',
          participantCount: 1,
        },
      ],
      totalMessagesAnalyzed: 3,
      timestamp: Date.now(),
    };

    mockChat.mockResolvedValue(JSON.stringify(mockClusterResult));

    const result = await clusterResponses(messages, sessionContext);

    expect(result.clusters).toHaveLength(2);
    expect(result.clusters[0].type).toBe('convergence');
    expect(result.clusters[1].type).toBe('tension');
    expect(result.totalMessagesAnalyzed).toBe(3);
  });

  it('should filter to user messages only before sending to LLM', async () => {
    const messages: ClusterInputMessage[] = [
      makeMessage('m1', 't1', 'User message'),
      { id: 'm2', threadId: 't1', content: 'Assistant response', role: 'assistant' },
      makeMessage('m3', 't2', 'Another user message'),
    ];

    mockChat.mockResolvedValue(JSON.stringify({
      clusters: [],
      totalMessagesAnalyzed: 2,
      timestamp: Date.now(),
    }));

    await clusterResponses(messages, sessionContext);

    // Check that only user messages were sent in the prompt
    const callArgs = mockChat.mock.calls[0][0];
    const userContent = callArgs.messages[1].content;
    expect(userContent).not.toContain('Assistant response');
    expect(userContent).toContain('User message');
    expect(userContent).toContain('Another user message');
  });

  it('should return empty clusters for fewer than 2 user messages', async () => {
    const messages: ClusterInputMessage[] = [
      makeMessage('m1', 't1', 'Only one message'),
    ];

    const result = await clusterResponses(messages, sessionContext);

    expect(result.clusters).toHaveLength(0);
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('should handle malformed LLM JSON by returning empty clusters', async () => {
    const messages: ClusterInputMessage[] = [
      makeMessage('m1', 't1', 'Message 1'),
      makeMessage('m2', 't2', 'Message 2'),
    ];

    mockChat.mockResolvedValue('This is not valid JSON at all');

    const result = await clusterResponses(messages, sessionContext);

    expect(result.clusters).toHaveLength(0);
  });

  it('should handle LLM throwing an error by returning empty clusters', async () => {
    const messages: ClusterInputMessage[] = [
      makeMessage('m1', 't1', 'Message 1'),
      makeMessage('m2', 't2', 'Message 2'),
    ];

    mockChat.mockRejectedValue(new Error('LLM timeout'));

    const result = await clusterResponses(messages, sessionContext);

    expect(result.clusters).toHaveLength(0);
  });
});
