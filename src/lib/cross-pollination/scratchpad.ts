import { getLLM } from '@/lib/modelConfig';
import { SessionScratchpadSchema } from './types';
import { SCRATCHPAD_UPDATE_PROMPT } from './prompts';
import type { ClusterInputMessage, SessionContext, SessionScratchpad } from './types';

const SCRATCHPAD_UPDATE_THRESHOLD = 3; // Update after this many new messages

interface ScratchpadCacheEntry {
  scratchpad: SessionScratchpad;
  messageCountAtUpdate: number;
}

/**
 * In-memory cache for session scratchpads, keyed by session ID.
 * Same pattern as ClusterCache — module-level singleton.
 */
export class ScratchpadCache {
  private cache = new Map<string, ScratchpadCacheEntry>();

  get(sessionId: string): ScratchpadCacheEntry | null {
    return this.cache.get(sessionId) ?? null;
  }

  set(sessionId: string, scratchpad: SessionScratchpad, messageCount: number): void {
    this.cache.set(sessionId, { scratchpad, messageCountAtUpdate: messageCount });
  }

  needsUpdate(sessionId: string, currentMessageCount: number): boolean {
    const entry = this.cache.get(sessionId);
    if (!entry) return true;
    return currentMessageCount - entry.messageCountAtUpdate >= SCRATCHPAD_UPDATE_THRESHOLD;
  }

  evict(sessionId: string): void {
    this.cache.delete(sessionId);
  }
}

/**
 * Incrementally update the session scratchpad using LLM.
 * Pure function — no side effects, no DB access.
 * Caller handles caching and deciding when to run.
 *
 * @param currentScratchpad - Current scratchpad state (null for first update)
 * @param newMessages - Messages since last scratchpad update
 * @param sessionContext - Session topic, goal, description
 * @returns Updated scratchpad, or null on error/skip
 */
export async function updateScratchpad(
  currentScratchpad: SessionScratchpad | null,
  newMessages: ClusterInputMessage[],
  sessionContext: SessionContext,
): Promise<SessionScratchpad | null> {
  const userMessages = newMessages.filter((m) => m.role === 'user');

  if (userMessages.length === 0) {
    console.log('[scratchpad] No new user messages, skipping scratchpad update');
    return null;
  }

  try {
    const llm = getLLM('MAIN', 0.3);

    const payload: Record<string, unknown> = {
      sessionContext: {
        topic: sessionContext.topic,
        goal: sessionContext.goal,
        description: sessionContext.description || '',
      },
      newMessages: userMessages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        content: m.content,
      })),
      currentTimestamp: Date.now(),
    };

    if (currentScratchpad) {
      payload.currentScratchpad = currentScratchpad;
    }

    const response = await llm.chat({
      messages: [
        { role: 'system', content: SCRATCHPAD_UPDATE_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    });

    const cleanedResponse = response.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = SessionScratchpadSchema.safeParse(JSON.parse(cleanedResponse));

    if (!parsed.success) {
      console.error('[scratchpad] Failed to parse scratchpad update response', {
        error: parsed.error.message,
        response: response.slice(0, 200),
      });
      return null;
    }

    // Override lastUpdated server-side — don't trust LLM to echo timestamp correctly
    const result = { ...parsed.data, lastUpdated: Date.now() };

    // Preserve firstSeen on existing themes — LLM may reset them
    if (currentScratchpad) {
      const existingFirstSeen = new Map(
        currentScratchpad.themes.map((t) => [t.label, t.firstSeen]),
      );
      result.themes = result.themes.map((t) => ({
        ...t,
        firstSeen: existingFirstSeen.get(t.label) ?? t.firstSeen,
      }));
    }

    console.log('[scratchpad] Scratchpad updated', {
      themeCount: result.themes.length,
      participantCount: result.participantCount,
      consensusCount: result.emergingConsensus.length,
      tensionCount: result.openTensions.length,
    });

    return result;
  } catch (error) {
    console.error('[scratchpad] Error in updateScratchpad', { error: String(error) });
    return null;
  }
}
