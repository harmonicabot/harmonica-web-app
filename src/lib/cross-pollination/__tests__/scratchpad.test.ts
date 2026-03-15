import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScratchpadCache, updateScratchpad } from '../scratchpad';
import type { SessionScratchpad, ClusterInputMessage, SessionContext } from '../types';

// Mock LLM
const mockChat = vi.fn();
vi.mock('@/lib/modelConfig', () => ({
  getLLM: vi.fn(() => ({ chat: mockChat })),
}));

const EMPTY_SCRATCHPAD: SessionScratchpad = {
  themes: [],
  questionsWellCovered: [],
  emergingConsensus: [],
  openTensions: [],
  participantCount: 0,
  lastUpdated: 0,
};

const makeScratchpad = (overrides: Partial<SessionScratchpad> = {}): SessionScratchpad => ({
  ...EMPTY_SCRATCHPAD,
  ...overrides,
});

const makeMessage = (id: string, threadId: string, content: string): ClusterInputMessage => ({
  id,
  threadId,
  content,
  role: 'user',
});

const sessionContext: SessionContext = {
  topic: 'Remote work policies',
  goal: 'Understand employee preferences for hybrid work',
};

describe('ScratchpadCache', () => {
  let cache: ScratchpadCache;

  beforeEach(() => {
    cache = new ScratchpadCache();
  });

  it('should return null for uncached session', () => {
    expect(cache.get('session-1')).toBeNull();
  });

  it('should store and retrieve a scratchpad', () => {
    const pad = makeScratchpad({ participantCount: 3 });
    cache.set('session-1', pad, 5);
    const entry = cache.get('session-1');
    expect(entry).not.toBeNull();
    expect(entry!.scratchpad.participantCount).toBe(3);
    expect(entry!.messageCountAtUpdate).toBe(5);
  });

  it('should report needsUpdate when no cache exists', () => {
    expect(cache.needsUpdate('unknown', 10)).toBe(true);
  });

  it('should report needsUpdate when message delta meets threshold', () => {
    cache.set('s1', makeScratchpad(), 5);
    expect(cache.needsUpdate('s1', 8)).toBe(true); // delta 3 >= threshold 3
  });

  it('should not report needsUpdate when delta is below threshold', () => {
    cache.set('s1', makeScratchpad(), 5);
    expect(cache.needsUpdate('s1', 7)).toBe(false); // delta 2 < threshold 3
  });

  it('should evict a session', () => {
    cache.set('s1', makeScratchpad(), 5);
    cache.evict('s1');
    expect(cache.get('s1')).toBeNull();
  });
});

describe('updateScratchpad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return parsed scratchpad from LLM response', async () => {
    const newMessages = [
      makeMessage('m1', 't1', 'I prefer working from home'),
      makeMessage('m2', 't2', 'Office collaboration is important'),
    ];

    const expectedScratchpad: SessionScratchpad = {
      themes: [
        {
          label: 'Home work preference',
          type: 'convergence',
          summary: 'Participants prefer remote work for focus.',
          strength: 1,
          firstSeen: Date.now(),
        },
      ],
      questionsWellCovered: [],
      emergingConsensus: [],
      openTensions: ['Remote vs office productivity'],
      participantCount: 2,
      lastUpdated: Date.now(),
    };

    mockChat.mockResolvedValue(JSON.stringify(expectedScratchpad));

    const result = await updateScratchpad(null, newMessages, sessionContext);

    expect(result).not.toBeNull();
    expect(result!.themes).toHaveLength(1);
    expect(result!.participantCount).toBe(2);
  });

  it('should pass current scratchpad to LLM for incremental updates', async () => {
    const currentPad = makeScratchpad({ participantCount: 3 });
    const newMessages = [makeMessage('m3', 't3', 'New perspective')];

    const updatedPad = makeScratchpad({ participantCount: 4 });
    mockChat.mockResolvedValue(JSON.stringify(updatedPad));

    await updateScratchpad(currentPad, newMessages, sessionContext);

    const callArgs = mockChat.mock.calls[0][0];
    const userContent = callArgs.messages[1].content;
    expect(userContent).toContain('"participantCount":3');
  });

  it('should return null on malformed LLM JSON', async () => {
    const newMessages = [makeMessage('m1', 't1', 'Hello')];
    mockChat.mockResolvedValue('not valid json');

    const result = await updateScratchpad(null, newMessages, sessionContext);
    expect(result).toBeNull();
  });

  it('should return null on LLM error', async () => {
    const newMessages = [makeMessage('m1', 't1', 'Hello')];
    mockChat.mockRejectedValue(new Error('LLM timeout'));

    const result = await updateScratchpad(null, newMessages, sessionContext);
    expect(result).toBeNull();
  });

  it('should skip update when no new messages', async () => {
    const result = await updateScratchpad(null, [], sessionContext);
    expect(result).toBeNull();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('should return null when JSON is valid but fails Zod schema', async () => {
    const newMessages = [makeMessage('m1', 't1', 'Hello')];
    mockChat.mockResolvedValue(JSON.stringify({ invalid: true }));

    const result = await updateScratchpad(null, newMessages, sessionContext);
    expect(result).toBeNull();
  });

  it('should handle markdown code fence wrapped JSON', async () => {
    const newMessages = [makeMessage('m1', 't1', 'Hello')];
    const pad = makeScratchpad({ participantCount: 1 });
    mockChat.mockResolvedValue('```json\n' + JSON.stringify(pad) + '\n```');

    const result = await updateScratchpad(null, newMessages, sessionContext);
    expect(result).not.toBeNull();
    expect(result!.participantCount).toBe(1);
  });

  it('should filter out assistant messages', async () => {
    const messages: ClusterInputMessage[] = [
      makeMessage('m1', 't1', 'User message'),
      { id: 'm2', threadId: 't1', content: 'Assistant response', role: 'assistant' },
    ];
    mockChat.mockResolvedValue(JSON.stringify(makeScratchpad({ participantCount: 1 })));

    await updateScratchpad(null, messages, sessionContext);

    const callArgs = mockChat.mock.calls[0][0];
    const userContent = callArgs.messages[1].content;
    expect(userContent).toContain('User message');
    expect(userContent).not.toContain('Assistant response');
  });

  it('should skip update when all messages are assistant-only', async () => {
    const messages: ClusterInputMessage[] = [
      { id: 'm1', threadId: 't1', content: 'Assistant response', role: 'assistant' },
    ];

    const result = await updateScratchpad(null, messages, sessionContext);
    expect(result).toBeNull();
    expect(mockChat).not.toHaveBeenCalled();
  });

  it('should override lastUpdated server-side', async () => {
    const newMessages = [makeMessage('m1', 't1', 'Hello')];
    const pad = makeScratchpad({ lastUpdated: 999 });
    mockChat.mockResolvedValue(JSON.stringify(pad));

    const before = Date.now();
    const result = await updateScratchpad(null, newMessages, sessionContext);
    const after = Date.now();

    expect(result).not.toBeNull();
    expect(result!.lastUpdated).toBeGreaterThanOrEqual(before);
    expect(result!.lastUpdated).toBeLessThanOrEqual(after);
  });

  it('should preserve firstSeen on existing themes during incremental update', async () => {
    const originalFirstSeen = 1000;
    const currentPad = makeScratchpad({
      themes: [{
        label: 'Existing theme',
        type: 'convergence',
        summary: 'Original summary',
        strength: 2,
        firstSeen: originalFirstSeen,
      }],
    });

    const newMessages = [makeMessage('m3', 't3', 'More on existing theme')];
    const llmResponse = makeScratchpad({
      themes: [{
        label: 'Existing theme',
        type: 'convergence',
        summary: 'Updated summary',
        strength: 3,
        firstSeen: 9999,
      }],
    });
    mockChat.mockResolvedValue(JSON.stringify(llmResponse));

    const result = await updateScratchpad(currentPad, newMessages, sessionContext);

    expect(result).not.toBeNull();
    expect(result!.themes[0].firstSeen).toBe(originalFirstSeen);
  });
});
