import { getLLM } from '@/lib/modelConfig';

import { ClusterResultSchema } from './types';
import { CLUSTERING_PROMPT } from './prompts';
import type { ClusterInputMessage, SessionContext, ClusterResult } from './types';

const logger = {
  info: (msg: string, data?: object) => console.log(`[cross-pollination:clustering] ${msg}`, data || ''),
  error: (msg: string, data?: object) => console.error(`[cross-pollination:clustering] ${msg}`, data || ''),
};

const EMPTY_RESULT: ClusterResult = {
  clusters: [],
  totalMessagesAnalyzed: 0,
  timestamp: Date.now(),
};

/**
 * Cluster participant responses into thematic groups using LLM.
 * Pure function — no side effects, no DB access.
 * Caller handles caching and deciding when to run.
 */
export async function clusterResponses(
  messages: ClusterInputMessage[],
  sessionContext: SessionContext,
): Promise<ClusterResult> {
  // Filter to user messages only
  const userMessages = messages.filter((m) => m.role === 'user');

  if (userMessages.length < 2) {
    logger.info('Not enough user messages for clustering', { count: userMessages.length });
    return { ...EMPTY_RESULT, timestamp: Date.now() };
  }

  try {
    const llm = getLLM('MAIN', 0.3);

    const messagesPayload = userMessages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      content: m.content,
    }));

    const response = await llm.chat({
      messages: [
        { role: 'system', content: CLUSTERING_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            sessionContext: {
              topic: sessionContext.topic,
              goal: sessionContext.goal,
              description: sessionContext.description || '',
            },
            messages: messagesPayload,
            currentTimestamp: Date.now(),
          }),
        },
      ],
      // tag: 'cross_pollination_clustering', // Pro-only: observability tag
    });

    // Strip markdown code fences if present (LLMs often wrap JSON in ```json ... ```)
    const cleanedResponse = response.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = ClusterResultSchema.safeParse(JSON.parse(cleanedResponse));

    if (!parsed.success) {
      logger.error('Failed to parse clustering response', {
        error: parsed.error.message,
        response: response.slice(0, 200),
      });
      return { ...EMPTY_RESULT, timestamp: Date.now() };
    }

    logger.info('Clustering complete', {
      clusterCount: parsed.data.clusters.length,
      messagesAnalyzed: parsed.data.totalMessagesAnalyzed,
    });

    return parsed.data;
  } catch (error) {
    logger.error('Error in clusterResponses', { error: String(error) });
    return { ...EMPTY_RESULT, timestamp: Date.now() };
  }
}
