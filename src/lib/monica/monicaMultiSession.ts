import * as db from '@/lib/db';
import { OpenAIMessage } from '../types';
import { getPromptInstructions } from '../promptsCache';
import { getSessionContent } from './qdrantQuery';
import { getLLM } from '../modelConfig';

export async function generateMultiSessionAnswer(
  sessionIds: string[],
  chatHistory: OpenAIMessage[],
  query: string,
  distinctId?: string
) {
  try {
    console.log(
      '[i] Generating multi-session answer for session(s):',
      sessionIds,
    );
    // Get session context and objective data for all sessions
    const sessionsData = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const data = await db.getFromHostSession(sessionId, [
          'context',
          'critical',
          'goal',
          'topic',
        ]);
        return { sessionId, ...data };
      }),
    );

    // Get all messages from all sessions
    const sessionMessages = await Promise.all(
      sessionIds.map(async (sessionId) => {
        // Get all messages for this session
        const messages = await db.getAllMessagesForSessionSorted(sessionId);
        return messages.map((msg) => ({ ...msg, sessionId })); // Tag messages with their sessionId
      }),
    ).then((messages) => messages.flat());

    console.log(
      `[i] First 10 raw messages (out of ${sessionMessages.length}):`,
      sessionMessages.slice(0, 10).map((msg) => ({
        role: msg.role,
        thread_id: msg.thread_id,
        content: msg.content.slice(0, 50) + '...', // First 50 chars
      })),
    );

    // Helper function to get session letter (A, B, C, etc.)
    const getSessionLetter = (index: number) => String.fromCharCode(65 + index); // 65 is ASCII for 'A'

    // Process and sanitize session messages
    const processedMessagesBySession = sessionIds
      .map((sessionId, sessionIndex) => {
        // Extract messages for this session
        const sessionMsgs = sessionMessages.filter(
          (msg) => msg.role === 'user' && msg.sessionId === sessionId,
        );

        // Group messages by thread and sort chronologically
        const threadGroups = sessionMsgs.reduce((groups, msg) => {
          const group = groups.get(msg.thread_id) || [];
          group.push({
            timestamp: msg.created_at,
            content: msg.content.trim(),
            // content: anonymizeContent(msg.content.trim(), sessionIndex + 1),
          });
          groups.set(msg.thread_id, group);
          return groups;
        }, new Map());

        console.log(
          `Grouped messages into ${threadGroups.size} distinct threads (#participants)`,
        );
        // Format context data for this session
        const sessionTopic =
          sessionsData[sessionIndex]?.topic || 'Unnamed Session';

        const sessionContext = `
Session: ${sessionTopic}
Context:
Goal: ${sessionsData[sessionIndex]?.goal || 'No goal specified'}
${sessionsData[sessionIndex]?.context ? `Background Context: ${sessionsData[sessionIndex].context}` : ''}
${sessionsData[sessionIndex]?.critical ? `Key Points: ${sessionsData[sessionIndex].critical}` : ''}`;

        // Process each thread group
        const processedThreads = Array.from(threadGroups.entries())
          .map(([_, messages], threadIndex) => {
            const sortedMessages = messages
              .sort(
                (a: { timestamp: Date }, b: { timestamp: Date }) =>
                  a.timestamp.getTime() - b.timestamp.getTime(),
              )
              .map((msg: { content: string }) => msg.content)
              .filter((content: string) => content.length > 0);

            // Skip context-only conversations
            if (
              sortedMessages.length === 1 &&
              sortedMessages[0].startsWith('User shared the following context:')
            ) {
              return null;
            }

            return sortedMessages.length > 0
              ? `${sessionTopic} Conversation ${threadIndex + 1}:\n${sortedMessages.join('\n\n')}`
              : null;
          })
          .filter(Boolean);

        return processedThreads.length > 0
          ? `${sessionContext}\n\n${processedThreads.join('\n\n---\n\n')}`
          : null;
      })
      .filter(Boolean)
      .join('\n\n==========\n\n');

    console.log('[i] Processed messages:', processedMessagesBySession.length);

    // Add more descriptive fallback message
    const messagesContent =
      processedMessagesBySession ||
      'No messages are currently available for analysis. Please ensure the selected sessions contain conversation data.';

    // Early return if no valid content
    if (!processedMessagesBySession) {
      return "I apologize, but I don't have any conversation data to analyze. Please ensure the selected sessions contain messages.";
    }

    // Helper function to anonymize content
    // function anonymizeContent(content: string, sessionNum: number) {
    //   return content
    //     .replace(/\b(I|me|my|mine)\b/gi, `Participant${sessionNum}`)
    //     .replace(/\b(you|your|yours)\b/gi, 'Coach')
    //     .replace(/\b(we|our|ours)\b/gi, `Group${sessionNum}`);
    // }

    // Format context data properly for all sessions
    const mergedContext = sessionsData
      .map(
        (contextData) => `
Session Context:
Topic: ${contextData?.topic || 'No topic specified'}
Goal: ${contextData?.goal || 'No goal specified'}
${contextData?.context ? `Background Context: ${contextData?.context}` : ''}
${contextData?.critical ? `Key Points: ${contextData?.critical}` : ''}`,
      )
      .join('\n\n');

    const chatEngine = getLLM("LARGE", 0.3);

    const chatHistoryWithoutInitialWelcoming = chatHistory.slice(1);
    const chatHistoryForPrompt =
      chatHistoryWithoutInitialWelcoming.length > 0
        ? `### Previous Questions & Answers for immediate chat context:\n${chatHistoryWithoutInitialWelcoming
            .map(
              (msg) =>
                `${msg.role === 'user' ? 'Question' : 'Answer'}: ${msg.content}`,
            )
            .join('\n\n')}`
        : '';

    // Get Qdrant content for single session
    let qdrantContent = null;
    if (sessionIds.length === 1) {
      console.log(`[i] Single session detected (${sessionIds[0]})`);
      qdrantContent = await getSessionContent(sessionIds[0], query);
    }

    const userPrompt = `
### Sessions Context:
${mergedContext}

### Historical Messages by Session:
${messagesContent}

${chatHistoryForPrompt}

${qdrantContent?.TRANSCRIPT ? `### Relevant Transcript Content:\n${qdrantContent.TRANSCRIPT}\n\n` : ''}
${qdrantContent?.KNOWLEDGE ? `### Relevant Knowledge Content:\n${qdrantContent.KNOWLEDGE}\n\n` : ''}
### Question: ${query}
`;
    console.log('[i] User prompt length: ', userPrompt.length);
    console.log(
      '[i] User prompt:',
      userPrompt.length > 1000
        ? `${userPrompt.slice(0, 500)}...${userPrompt.slice(-500)}`
        : userPrompt,
    );
    console.log('[i] Sending query to AI...');
    const askAiPrompt = await getPromptInstructions('ASK_AI_PROMPT');

    // Send the whole prompt to the AI:
    // TODO: if possible, we should reuse the previously used thread and avoid sending _everything_.
    const response = await chatEngine.chat({
      messages: [
        { role: 'system', content: askAiPrompt },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      distinctId,
    });

    console.log('[i] Received response: ', response);
    return response;
    // }
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
