import type { SessionScratchpad } from './types';

/**
 * Convert scratchpad state into a prompt section for the facilitator.
 * Returns '' for Tier 0 (no data), theme labels for Tier 1, full scratchpad for Tier 2.
 */
export function formatScratchpadForPrompt(scratchpad: SessionScratchpad | null): string {
  if (!scratchpad || scratchpad.themes.length === 0) {
    return '';
  }

  const maxStrength = Math.max(...scratchpad.themes.map((t) => t.strength));
  const isTier2 = maxStrength >= 3;

  const instruction =
    'Reference group themes when natural, skip well-covered questions, ' +
    'use consensus and tensions to enrich your responses. ' +
    'Never label insights as cross-pollination. ' +
    "Never force group themes where they don't fit.";

  if (!isTier2) {
    // Tier 1: theme labels and types only
    const themeList = scratchpad.themes
      .map((t) => `- ${t.label} [${t.type}]`)
      .join('\n');

    return (
      '\n\n--- Group Context (emerging themes) ---\n' +
      `${themeList}\n\n` +
      `${instruction}`
    );
  }

  // Tier 2: full scratchpad
  const themeList = scratchpad.themes
    .map((t) => `- ${t.label} [${t.type}, strength ${t.strength}]: ${t.summary}`)
    .join('\n');

  let sections = `\n\n--- Group Context (session themes) ---\n${themeList}`;

  if (scratchpad.emergingConsensus.length > 0) {
    sections +=
      '\n\nEmerging consensus:\n' +
      scratchpad.emergingConsensus.map((c) => `- ${c}`).join('\n');
  }

  if (scratchpad.openTensions.length > 0) {
    sections +=
      '\n\nOpen tensions:\n' +
      scratchpad.openTensions.map((t) => `- ${t}`).join('\n');
  }

  if (scratchpad.questionsWellCovered.length > 0) {
    sections +=
      '\n\nQuestions well-covered (skip or go deeper):\n' +
      scratchpad.questionsWellCovered.map((q) => `- ${q}`).join('\n');
  }

  sections += `\n\n${instruction}`;

  return sections;
}
