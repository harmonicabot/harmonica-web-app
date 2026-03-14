import { getLLM } from '@/lib/modelConfig';
import { NOVELTY_CHECK_PROMPT, RELEVANCE_CHECK_PROMPT } from './prompts';
import type { ClusterResult, QualityResult } from './types';

const logger = {
  info: (msg: string, data?: object) => console.log(`[cross-pollination:quality] ${msg}`, data || ''),
  error: (msg: string, data?: object) => console.error(`[cross-pollination:quality] ${msg}`, data || ''),
};

/** Patterns that indicate individual-level references instead of group synthesis */
const INDIVIDUAL_REFERENCE_PATTERNS = [
  /one participant said/i,
  /a participant (said|mentioned|noted|suggested|argued|expressed|shared|pointed)/i,
  /another participant/i,
  /one person (said|mentioned|noted|suggested)/i,
  /someone (said|mentioned|noted|suggested)/i,
  /one of the participants/i,
  /a single participant/i,
];

const MIN_INSIGHT_LENGTH = 50;

/**
 * Validate a cross-pollination insight before showing to participant.
 * Pure function — no side effects, no DB access.
 * Gates are checked in order (fail-fast): length → cluster_reference → novelty → relevance.
 */
export async function validateInsight(
  insight: string,
  clusterResult: ClusterResult,
  priorInsights: string[],
  threadMessages: Array<{ role: string; content: string }>,
): Promise<QualityResult> {
  // Gate 1: Minimum length
  if (insight.length < MIN_INSIGHT_LENGTH) {
    logger.info('Insight failed length gate', { length: insight.length });
    return { passed: false, failedGate: 'length', reason: `Insight too short (${insight.length} chars)` };
  }

  // Gate 2: Cluster reference (deterministic)
  // 2a: Cluster data must have been non-empty
  if (clusterResult.clusters.length === 0) {
    logger.info('Insight failed cluster_reference gate: empty clusters');
    return { passed: false, failedGate: 'cluster_reference', reason: 'No cluster data available' };
  }
  // 2b: Output must not reference individual participants
  for (const pattern of INDIVIDUAL_REFERENCE_PATTERNS) {
    if (pattern.test(insight)) {
      logger.info('Insight failed cluster_reference gate: individual reference', { pattern: pattern.source });
      return { passed: false, failedGate: 'cluster_reference', reason: `References individual participant: ${pattern.source}` };
    }
  }

  // Gate 3: Novelty check (LLM) — only when there are prior insights to compare against
  if (priorInsights.length > 0) {
    try {
      const llm = getLLM('MAIN', 0.3);
      const response = await llm.chat({
        messages: [
          { role: 'system', content: NOVELTY_CHECK_PROMPT },
          {
            role: 'user',
            content: `New insight:\n${insight}\n\nPrior insights:\n${priorInsights.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
          },
        ],
        // tag: 'cross_pollination_novelty_check', // Pro-only
      });

      if (response.trim().toUpperCase().startsWith('FAIL')) {
        logger.info('Insight failed novelty gate', { response: response.trim() });
        return { passed: false, failedGate: 'novelty', reason: response.trim() };
      }
    } catch (error) {
      logger.error('Error in novelty check, failing safe', { error: String(error) });
      return { passed: false, failedGate: 'novelty', reason: `Novelty check error: ${error}` };
    }
  }

  // Gate 4: Relevance check (LLM)
  try {
    const llm = getLLM('MAIN', 0.3);
    const threadSummary = threadMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');

    const response = await llm.chat({
      messages: [
        { role: 'system', content: RELEVANCE_CHECK_PROMPT },
        {
          role: 'user',
          content: `Insight:\n${insight}\n\nParticipant's messages:\n${threadSummary}`,
        },
      ],
      // tag: 'cross_pollination_relevance_check', // Pro-only
    });

    if (response.trim().toUpperCase().startsWith('FAIL')) {
      logger.info('Insight failed relevance gate', { response: response.trim() });
      return { passed: false, failedGate: 'relevance', reason: response.trim() };
    }
  } catch (error) {
    logger.error('Error in relevance check, failing safe', { error: String(error) });
    return { passed: false, failedGate: 'relevance', reason: `Relevance check error: ${error}` };
  }

  logger.info('Insight passed all quality gates');
  return { passed: true };
}
