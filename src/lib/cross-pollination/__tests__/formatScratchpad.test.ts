import { describe, it, expect } from 'vitest';
import { formatScratchpadForPrompt } from '../formatScratchpad';
import type { SessionScratchpad } from '../types';

const makeScratchpad = (overrides: Partial<SessionScratchpad> = {}): SessionScratchpad => ({
  themes: [],
  questionsWellCovered: [],
  emergingConsensus: [],
  openTensions: [],
  participantCount: 0,
  lastUpdated: Date.now(),
  ...overrides,
});

describe('formatScratchpadForPrompt', () => {
  it('should return empty string for null scratchpad (Tier 0)', () => {
    expect(formatScratchpadForPrompt(null)).toBe('');
  });

  it('should return empty string for scratchpad with no themes (Tier 0)', () => {
    const pad = makeScratchpad();
    expect(formatScratchpadForPrompt(pad)).toBe('');
  });

  it('should return theme labels only for Tier 1 (all strength < 3)', () => {
    const pad = makeScratchpad({
      themes: [
        { label: 'Privacy concerns', type: 'convergence', summary: 'People worry about data.', strength: 2, firstSeen: Date.now() },
        { label: 'Cost vs quality', type: 'tension', summary: 'Tradeoffs exist.', strength: 1, firstSeen: Date.now() },
      ],
    });
    const result = formatScratchpadForPrompt(pad);
    expect(result).toContain('Privacy concerns');
    expect(result).toContain('convergence');
    expect(result).toContain('Cost vs quality');
    expect(result).toContain('tension');
    expect(result).not.toContain('People worry about data.');
    expect(result).not.toContain('Emerging consensus');
    expect(result).not.toContain('Open tensions');
  });

  it('should return full scratchpad for Tier 2 (any theme strength >= 3)', () => {
    const pad = makeScratchpad({
      themes: [
        { label: 'AI accessibility', type: 'convergence', summary: 'Multiple participants want AI tools accessible to non-tech users.', strength: 5, firstSeen: Date.now() },
        { label: 'Privacy risks', type: 'tension', summary: 'Disagreement on data collection.', strength: 2, firstSeen: Date.now() },
      ],
      emergingConsensus: ['AI should empower, not replace'],
      openTensions: ['How much data collection is acceptable?'],
      questionsWellCovered: ['What is AI good for?'],
    });
    const result = formatScratchpadForPrompt(pad);
    expect(result).toContain('Multiple participants want AI tools accessible to non-tech users.');
    expect(result).toContain('Disagreement on data collection.');
    expect(result).toContain('AI should empower, not replace');
    expect(result).toContain('How much data collection is acceptable?');
    expect(result).toContain('What is AI good for?');
  });

  it('should include the facilitation instruction', () => {
    const pad = makeScratchpad({
      themes: [
        { label: 'Theme', type: 'convergence', summary: 'Summary.', strength: 1, firstSeen: Date.now() },
      ],
    });
    const result = formatScratchpadForPrompt(pad);
    expect(result).toContain('Reference group themes when natural');
    expect(result).toContain('Never label insights as cross-pollination');
  });

  it('should not include instruction for Tier 0', () => {
    expect(formatScratchpadForPrompt(null)).toBe('');
    expect(formatScratchpadForPrompt(makeScratchpad())).toBe('');
  });
});
