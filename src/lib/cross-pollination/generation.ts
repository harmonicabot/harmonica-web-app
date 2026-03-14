import { getLLM } from '@/lib/modelConfig';
import { createLogger } from '@/lib/logger';
import { clusterResponses } from './clustering';
import { validateInsight } from './quality';
import { GENERATION_PROMPT } from './prompts';
import type { ClusterInputMessage, SessionContext, ClusterResult } from './types';
import type { ClusterCache } from './cache';

const logger = createLogger('harmonica.crossPollination.generation');

interface GenerateCrossPollinationParams {
  allMessages: ClusterInputMessage[];
  threadMessages: Array<{ role: string; content: string }>;
  threadId: string;
  sessionId: string;
  sessionContext: SessionContext;
  priorInsights: string[];
  cache: ClusterCache;
}

/**
 * Orchestrate the full cross-pollination pipeline:
 * 1. Check cache / re-cluster if needed
 * 2. Generate insight from clusters
 * 3. Validate quality
 * 4. Retry once on failure, then skip
 *
 * Returns the insight string, or null if skipped.
 */
export async function generateCrossPollination(
  params: GenerateCrossPollinationParams,
): Promise<string | null> {
  const { allMessages, threadMessages, threadId, sessionId, sessionContext, priorInsights, cache } = params;

  // Step 1: Get or refresh clusters
  let clusterResult: ClusterResult;

  const userMessageCount = allMessages.filter((m) => m.role === 'user').length;

  if (cache.needsUpdate(sessionId, userMessageCount)) {
    logger.info('Clustering needed, running clusterResponses', { sessionId, messageCount: userMessageCount });
    clusterResult = await clusterResponses(allMessages, sessionContext);
    cache.set(sessionId, clusterResult, userMessageCount);
  } else {
    const cached = cache.get(sessionId);
    clusterResult = cached!.clusterResult;
    logger.info('Using cached clusters', { sessionId, clusterCount: clusterResult.clusters.length });
  }

  // No clusters = nothing to cross-pollinate
  if (clusterResult.clusters.length === 0) {
    logger.info('No clusters found, skipping cross-pollination');
    return null;
  }

  // Step 2: Generate insight (with one retry on quality failure)
  let lastFailureReason = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const llm = getLLM('LARGE', 0.3);

      const retryGuidance = attempt > 0
        ? `\n\nIMPORTANT: Your previous insight was rejected. Reason: ${lastFailureReason}. Fix this specific issue.`
        : '';

      const response = await llm.chat({
        messages: [
          { role: 'system', content: GENERATION_PROMPT + retryGuidance },
          {
            role: 'user',
            content: JSON.stringify({
              sessionContext: {
                topic: sessionContext.topic,
                goal: sessionContext.goal,
              },
              clusters: clusterResult.clusters,
              currentThread: threadMessages,
            }),
          },
        ],
        tag: 'cross_pollination_generation',
      });

      const insight = response.trim();

      // Step 3: Validate quality
      const quality = await validateInsight(insight, clusterResult, priorInsights, threadMessages);

      if (quality.passed) {
        logger.info('Cross-pollination insight generated and validated', { attempt });
        return insight;
      }

      lastFailureReason = quality.reason || quality.failedGate || 'unknown';
      logger.info('Insight failed quality check', {
        attempt,
        gate: quality.failedGate,
        reason: quality.reason,
      });
    } catch (error) {
      logger.error('Error generating cross-pollination insight', { attempt, error: String(error) });
    }
  }

  logger.info('Cross-pollination skipped after 2 failed attempts');
  return null;
}
