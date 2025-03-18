import * as db from '@/lib/db';
import { getLLM } from '@/lib/modelConfig';
import { getPromptInstructions } from '@/lib/promptsCache';

export async function generateMultiSessionSummary(sessionIds: string[]) {
  // console.log('[i] Generating multi-session summary for sessions:', sessionIds);
  try {
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

    const chatEngine = getLLM('MAIN', 0.3);

    const userPrompt = `
### Historical Messages by Session:
${messagesContent}
`;

    const summaryPrompt = await getPromptInstructions('SUMMARY_PROMPT');

    const response = await chatEngine.chat({
      messages: [
        { role: 'system', content: summaryPrompt },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    return response.message.content;
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
