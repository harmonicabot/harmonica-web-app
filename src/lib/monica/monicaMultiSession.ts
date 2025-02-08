import { GEMINI_MODEL } from 'llamaindex';

import * as db from '@/lib/db';
import { Gemini } from 'llamaindex';

const initialPrompt = `
### Guidelines:

1. **Task Focus**:
     * Analyze ALL provided messages and conversations
     * Count occurrences and identify patterns
     * Provide quantitative insights when possible
     * Synthesize information across all available data

2. **Response Structure**:
   - **Direct Answer**: Provide a concise response to the user's question
   - **Contextual Reference**: Cite specific relevant details or patterns from the chat history
   - **Insight/Recommendation** (if applicable): Offer additional analysis or actionable insights

3. **Handling Frequencies and Patterns**:
   - When asked about "most common" or patterns:
     * Review all messages
     * Count occurrences
     * Identify recurring themes
     * Provide specific examples

4. **Security & Privacy** (CRITICAL):
   - NEVER include any identifiers in responses
   - Use generic terms like "a participant" or "several participants"
   - Remove or redact any identifiers from examples`;

export async function generateMultiSessionAnswer(
  sessionIds: string[],
  threadId: string,
  query: string,
) {
  try {
    console.log('[i] Generating multi-session answer for query:', sessionIds);
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

    // Get all messages for this thread
    const chatHistory = await db.getAllChatMessagesInOrder(threadId);

    // Get all messages from all sessions
    const sessionMessages = await Promise.all(
      sessionIds.map(async (sessionId) => {
        // Get all messages for this session
        const messages = await db.getAllMessagesForSessionSorted(sessionId);
        return messages.map((msg) => ({ ...msg, sessionId })); // Tag messages with their sessionId
      }),
    ).then((messages) => messages.flat());

    console.log(
      '[i] First 10 raw messages:',
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
          const threadNum = groups.get(msg.thread_id)?.length || 0;
          const group = groups.get(msg.thread_id) || [];
          group.push({
            timestamp: msg.created_at,
            content: anonymizeContent(msg.content.trim(), sessionIndex + 1),
          });
          groups.set(msg.thread_id, group);
          return groups;
        }, new Map());

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
    function anonymizeContent(content: string, sessionNum: number) {
      return content
        .replace(/\b(I|me|my|mine)\b/gi, `Participant${sessionNum}`)
        .replace(/\b(you|your|yours)\b/gi, 'Coach')
        .replace(/\b(we|our|ours)\b/gi, `Group${sessionNum}`);
    }

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

    const chatEngine = new Gemini({
      model: GEMINI_MODEL.GEMINI_PRO_LATEST,
      temperature: 0.3,
    });

    const userPrompt = `
### Sessions Context:
${mergedContext}

### Historical Messages by Session:
${messagesContent}

### Question: ${query}
`;

    console.log('[i] User prompt:', userPrompt);

    // Update the prompt structure
    const response = await chatEngine.chat({
      messages: [
        { role: 'system', content: initialPrompt },
        {
          role: 'user',
          content: userPrompt,
        },
        ...chatHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
    });

    return response.message.content;
    // }
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
