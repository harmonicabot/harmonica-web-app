'use server';

import { NewMessage } from '@/lib/schema';
import { AssistantMessageData } from '@/lib/types';
import { ChatMessage } from 'llamaindex';
import { NextResponse } from 'next/server';
import {
  getAllChatMessagesInOrder,
  getHostSessionById,
  updateUserSession,
  increaseSessionsCount,
} from '@/lib/db';
import { generateCrossPollination, ClusterCache, ScratchpadCache, updateScratchpad } from '@/lib/cross-pollination';
import type { ClusterInputMessage } from '@/lib/cross-pollination';
import { getLLM } from '@/lib/modelConfig';
import { getPromptInstructions } from '@/lib/promptsCache';
import { isSessionComplete } from '@/lib/sessionGenerator';
import { traceOperation } from '@/lib/braintrust';
import { getAllMessagesForSessionSorted } from '@/lib/db';

// Module-level singletons for cross-pollination (persist across requests)
const clusterCache = new ClusterCache();
const scratchpadCache = new ScratchpadCache();
const priorInsightsMap = new Map<string, string[]>(); // sessionId → prior insights (capped at 10)
const lastCrossPollinationMap = new Map<string, number>(); // sessionId:threadId → timestamp
const sessionContextMap = new Map<string, { topic: string; goal: string; description: string }>(); // sessionId → cached context
const MAX_PRIOR_INSIGHTS = 10;
const MAX_TRACKED_SESSIONS = 200; // evict oldest entries beyond this
const MIN_CROSS_POLLINATION_GAP_MS = 2 * 60 * 1000; // 2 minutes
const MIN_THREAD_MESSAGES_SINCE_LAST = 2;
const threadMessageCountAtLastCP = new Map<string, number>(); // sessionId:threadId → message count

export async function finishedResponse(
  systemPrompt: string,
  userPrompt: string,
  distinctId?: string,
) {
  return traceOperation(
    'session_builder',
    { distinctId },
    async ({ operation, span }) => {
      console.log('[i] Generating finished response:', {
        systemPrompt: systemPrompt?.substring(0, 100) + '...',
        userPrompt: userPrompt?.substring(0, 100) + '...',
      });

      // Try MAIN LLM first
      const primaryEngine = getLLM('MAIN', 0.3);

      try {
        const response = await primaryEngine.chat({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          distinctId,
          operation,
          span,
        });

        console.log('[i] Completion response:', JSON.stringify(response));
        const message = response;
        return message;
      } catch (error) {
        console.error('[x] Primary LLM error:', error);

        // Check if it's an overload error (529)
        const isOverloadError = error instanceof Error &&
          (error.message.includes('529') ||
           error.message.includes('overloaded_error') ||
           error.message.includes('Overloaded'));

        if (isOverloadError) {
          console.log('[i] MAIN model overload detected, trying SMALL fallback...');

          try {
            // Try the small model as fallback
            const fallbackEngine = getLLM('SMALL', 0.3);
            console.log('[i] Fallback engine created, attempting request with small model...');

            const fallbackResponse = await fallbackEngine.chat({
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                {
                  role: 'user',
                  content: userPrompt,
                },
              ],
              distinctId,
              operation,
              span,
            });

            console.log('[i] Fallback to small model successful:', JSON.stringify(fallbackResponse));
            return fallbackResponse;
          } catch (fallbackError) {
            console.error('[x] Small model fallback also failed:', fallbackError);
            throw new Error(`Both primary and fallback LLMs failed. Primary: ${(error as Error).message}, Fallback: ${fallbackError}`);
          }
        }

        // For non-overload errors, throw the original error
        throw new Error(`Failed to generate response: ${error}`);
      }
    },
  );
}

export async function handleGenerateAnswer(
  messageData: AssistantMessageData,
  crossPollinationEnabled: boolean,
  distinctId?: string,
): Promise<NewMessage> {
  return traceOperation(
    'chat_facilitation',
    { sessionId: messageData.sessionId, threadId: messageData.threadId, distinctId },
    async ({ operation, span }) => {
      console.log(`[i] Generating answer for message: `, messageData);

      const messages = messageData.threadId
        ? await getAllChatMessagesInOrder(messageData.threadId)
        : [];

      // Hoist session messages fetch — used by both cross-pollination and scratchpad.
      // Trade-off: this runs on every request with CP enabled (not just eligible ones).
      // Previously it only ran inside the eligibility check. The overhead is one DB query
      // per participant message in CP-enabled sessions, offset by eliminating double-fetches.
      let allSessionMessages: Awaited<ReturnType<typeof getAllMessagesForSessionSorted>> | null = null;

      if (crossPollinationEnabled && messageData.sessionId) {
        allSessionMessages = await getAllMessagesForSessionSorted(messageData.sessionId);
      }

      // Prepare scratchpad update — will run concurrently with facilitator LLM call
      let scratchpadUpdatePromise: Promise<void> | null = null;

      if (crossPollinationEnabled && messageData.sessionId && allSessionMessages) {
        const sessionId = messageData.sessionId;
        // Scratchpad counts user messages only (distinct from cluster cache which counts all)
        const userMessageCount = allSessionMessages.filter((m) => m.role === 'user').length;

        if (scratchpadCache.needsUpdate(sessionId, userMessageCount)) {
          let sessionContext = sessionContextMap.get(sessionId);
          if (!sessionContext) {
            const sessionData = await getHostSessionById(sessionId);
            sessionContext = {
              topic: sessionData?.topic || 'No topic specified',
              goal: sessionData?.goal || 'No goal specified',
              description: sessionData?.context || '',
            };
            sessionContextMap.set(sessionId, sessionContext);
          }

          const currentEntry = scratchpadCache.get(sessionId);
          const lastMessageCount = currentEntry?.messageCountAtUpdate || 0;

          // Slice new messages since last update. Assumes getAllMessagesForSessionSorted
          // returns stable append-only ordering (ORDER BY created_at).
          const newMessages: ClusterInputMessage[] = allSessionMessages
            .filter((m) => m.role === 'user')
            .slice(lastMessageCount)
            .map((m) => ({
              id: m.id,
              threadId: m.thread_id,
              content: m.content,
              role: m.role as 'user',
            }));

          // Start the update but don't await yet — will run concurrently with facilitator call
          scratchpadUpdatePromise = updateScratchpad(
            currentEntry?.scratchpad ?? null,
            newMessages,
            sessionContext,
          ).then((updated) => {
            if (updated) {
              scratchpadCache.set(sessionId, updated, userMessageCount);
              console.log('[scratchpad] Scratchpad updated for session', {
                sessionId,
                themeCount: updated.themes.length,
              });
            }
          }).catch((error) => {
            console.error('[scratchpad] Scratchpad update failed', { sessionId, error: String(error) });
          });
        }
      }

      // Cross-pollination: cluster-based pipeline with quality checks
      console.log(`[cross-pollination] enabled=${crossPollinationEnabled}, sessionId=${messageData.sessionId}, threadId=${messageData.threadId}`);
      if (crossPollinationEnabled && messageData.sessionId && messageData.threadId) {
        const sessionId = messageData.sessionId;
        const threadId = messageData.threadId;
        const cpKey = `${sessionId}:${threadId}`;

        // Check minimum time gap
        const lastCP = lastCrossPollinationMap.get(cpKey) || 0;
        const timeSinceLastCP = Date.now() - lastCP;

        // Check per-thread message count since last cross-pollination
        const lastCount = threadMessageCountAtLastCP.get(cpKey) || 0;
        const threadUserMessages = messages.filter((m) => m.role === 'user').length;
        const newMessagesSinceLastCP = threadUserMessages - lastCount;

        const eligible = timeSinceLastCP >= MIN_CROSS_POLLINATION_GAP_MS
          && messages.length >= 2
          && newMessagesSinceLastCP >= MIN_THREAD_MESSAGES_SINCE_LAST;

        console.log(`[cross-pollination] eligibility: timeSinceLastCP=${Math.round(timeSinceLastCP/1000)}s, messages=${messages.length}, threadUserMessages=${threadUserMessages}, lastCount=${lastCount}, newSinceLastCP=${newMessagesSinceLastCP}, eligible=${eligible}`);

        if (eligible) {
          try {
            // allSessionMessages already fetched above
            const clusterMessages: ClusterInputMessage[] = (allSessionMessages ?? []).map((m) => ({
              id: m.id,
              threadId: m.thread_id,
              content: m.content,
              role: m.role,
            }));

            // Get session context (cached — topic/goal don't change during a session)
            let sessionContext = sessionContextMap.get(sessionId);
            if (!sessionContext) {
              const sessionData = await getHostSessionById(sessionId);
              sessionContext = {
                topic: sessionData?.topic || 'No topic specified',
                goal: sessionData?.goal || 'No goal specified',
                description: sessionData?.context || '',
              };
              sessionContextMap.set(sessionId, sessionContext);
            }

            const priorInsights = priorInsightsMap.get(sessionId) || [];

            console.log(`[cross-pollination] calling generateCrossPollination with ${clusterMessages.length} messages, ${priorInsights.length} prior insights`);
            const insight = await generateCrossPollination({
              allMessages: clusterMessages,
              threadMessages: messages.map((m) => ({ role: m.role, content: m.content })),
              threadId,
              sessionId,
              sessionContext,
              priorInsights,
              cache: clusterCache,
            });

            console.log(`[cross-pollination] result: ${insight ? 'GOT INSIGHT' : 'null (skipped)'}`);
            if (insight) {
              // Track for future novelty checks and timing
              const updatedInsights = [...priorInsights, insight].slice(-MAX_PRIOR_INSIGHTS);
              priorInsightsMap.set(sessionId, updatedInsights);
              lastCrossPollinationMap.set(cpKey, Date.now());
              threadMessageCountAtLastCP.set(cpKey, threadUserMessages);

              // Basic eviction: if Maps grow too large, clear oldest entries
              if (priorInsightsMap.size > MAX_TRACKED_SESSIONS) {
                const firstKey = priorInsightsMap.keys().next().value;
                if (firstKey) {
                  priorInsightsMap.delete(firstKey);
                  sessionContextMap.delete(firstKey);
                  clusterCache.evict(firstKey);
                  scratchpadCache.evict(firstKey);
                }
              }

              // Await scratchpad even on CP early return — Vercel kills dangling promises.
              // Scratchpad is infrastructure for HAR-487/HAR-482 (not consumed yet).
              if (scratchpadUpdatePromise) {
                await scratchpadUpdatePromise;
              }

              return {
                thread_id: threadId,
                role: 'assistant' as const,
                content: `💡 Cross-pollination insight: ${insight}`,
                created_at: new Date(),
              };
            }
          } catch (error) {
            console.error('[x] Error in cross-pollination:', error);
            // Fall through to normal response generation
          }
        }
      }

      // Get host session data directly using session_id
      if (!messageData.sessionId) {
        // This is likely a 'test chat' during session creation, for which we don't have a sessionId yet.
        throw new Error('Session ID is required');
      }
      const sessionData = await getHostSessionById(messageData.sessionId);
      console.log(`[i] Session data:`, sessionData);

      const basicFacilitationPrompt = await getPromptInstructions(
        'BASIC_FACILITATION_PROMPT',
      );
      // Format context data
      const sessionContext = `
System Instructions:
${sessionData?.prompt || basicFacilitationPrompt}

Session Information:
- Topic: ${sessionData?.topic || 'No topic specified'}
- Goal: ${sessionData?.goal || 'No goal specified'}
${sessionData?.context ? `- Background Context: ${sessionData.context}` : ''}
${sessionData?.critical ? `- Key Points: ${sessionData.critical}` : ''}`;

      const chatEngine = getLLM('MAIN', 0.3);

      const formattedMessages = [
        { role: 'system', content: sessionContext },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      console.log('[i] Formatted messages:', formattedMessages);

      try {
        const message = await chatEngine.chat({
          messages: formattedMessages as ChatMessage[],
          distinctId,
          sessionId: messageData.sessionId,
          operation,
          span,
        });
        console.log('[i] Response:', message);

        let isFinal = false;

        // Check if this response is final, but only after 6 messages
        if (messageData.sessionId && messages.length >= 6) {
          isFinal = await isSessionComplete(message, sessionData);
        }

        // Wait for scratchpad update if one was started — runs concurrently with facilitator call
        // so this await typically resolves instantly (scratchpad update is faster than facilitation)
        if (scratchpadUpdatePromise) {
          await scratchpadUpdatePromise;
        }

        return {
          thread_id: messageData.threadId || '',
          role: 'assistant' as const,
          content: message,
          created_at: new Date(),
          is_final: isFinal,
        };
      } catch (error) {
        console.error('[x] Error generating response:', error);
        return {
          thread_id: messageData.threadId || '',
          role: 'assistant' as const,
          content: `I apologize, but I encountered an error processing your request. ${error}`,
          created_at: new Date(),
        };
      }
    },
  );
}

/**
 * Debug getter for cross-pollination state. Returns in-memory cache state
 * for a given session. Used by admin/scratchpad endpoint.
 *
 * Note: In-memory caches are per-serverless-instance. This returns the state
 * as seen by the instance handling this request — other instances may have
 * different state.
 */
export async function getCrossPollinationDebugState(sessionId: string) {
  const scratchpadEntry = scratchpadCache.get(sessionId);
  const clusterEntry = clusterCache.get(sessionId);

  return {
    sessionId,
    scratchpad: scratchpadEntry
      ? {
          state: scratchpadEntry.scratchpad,
          messageCountAtUpdate: scratchpadEntry.messageCountAtUpdate,
        }
      : null,
    clusters: clusterEntry
      ? {
          result: clusterEntry.clusterResult,
          messageCountAtClustering: clusterEntry.messageCountAtClustering,
        }
      : null,
    priorInsights: priorInsightsMap.get(sessionId) || [],
    sessionContext: sessionContextMap.get(sessionId) || null,
    trackedSessions: {
      priorInsights: priorInsightsMap.size,
      sessionContexts: sessionContextMap.size,
    },
  };
}

export async function handleResponse(
  systemPrompt: string,
  userPrompt: string,
  stream: boolean,
  distinctId?: string,
) {
  if (stream) {
    const streamData = streamResponse(systemPrompt, userPrompt, distinctId);
    return new NextResponse(streamData, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } else {
    const response = await finishedResponse(systemPrompt, userPrompt, distinctId);
    console.log('response from finishedResponse:', response);
    return NextResponse.json({ fullPrompt: response });
  }
}

function streamResponse(systemPrompt: string, userPrompt: string, distinctId?: string) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      // Try primary LLM first (usually Anthropic/Claude)
      const primaryEngine = getLLM('MAIN', 0.3);

      try {
        const response = await primaryEngine.chat({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          distinctId,
        });

        if (response) {
          controller.enqueue(encoder.encode(response));
        } else {
          controller.error('No content in response');
        }

        controller.close();
      } catch (error) {
        console.error('[x] Primary LLM error in stream:', error);
        
        // Check if it's an Anthropic overload error (529)
        const isOverloadError = error instanceof Error && 
          (error.message.includes('529') || 
           error.message.includes('overloaded_error') ||
           error.message.includes('Overloaded'));
        
        if (isOverloadError) {
          console.log('[i] Anthropic overload detected in stream, trying Gemini fallback...');
          
          try {
            // Try SMALL as fallback
            const fallbackEngine = getLLM('SMALL', 0.3); // Use SMALL for faster response
            console.log('[i] Stream fallback engine created, attempting Gemini request...');
            
            const fallbackResponse = await fallbackEngine.chat({
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                {
                  role: 'user',
                  content: userPrompt,
                },
              ],
              distinctId,
            });

            console.log('[i] Gemini fallback successful in stream');
            
            if (fallbackResponse) {
              controller.enqueue(encoder.encode(fallbackResponse));
            } else {
              controller.error('No content in fallback response');
            }

            controller.close();
            return;
          } catch (fallbackError) {
            console.error('[x] Gemini fallback also failed in stream:', fallbackError);
            controller.error(`Both primary and fallback LLMs failed. Primary: ${error.message}, Fallback: ${fallbackError}`);
            return;
          }
        }
        
        // For non-overload errors, throw the original error
        console.error('[x] Error in stream:', error);
        controller.error(`Stream failed: ${error}`);
      }
    },
  });
}
