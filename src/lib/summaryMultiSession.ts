import { GEMINI_MODEL } from 'llamaindex';

import * as db from '@/lib/db';
import { Gemini } from 'llamaindex';

const initialPrompt = `
Generate a structured **REPORT** based on all participant session transcripts (provided in a separate message). The report must address the stated **OBJECTIVE** (provided in a separate message) of the session and follow the formatting and style guidance below.

---
### Report Structure:

1. **Introduction**:
   - Briefly restate the session objective and purpose.
   - Provide context or background if necessary.

2. **Key Themes**:
   - Summarize the most common and important points raised by participants.
   - Organize responses into clear themes or categories.

3. **Divergent Opinions**:
   - Highlight significant areas of disagreement or unique insights that deviate from the common themes.
    
4. **Actionable Insights**:
   - Derive clear, actionable recommendations based on participant inputs.
   - Where possible, link these recommendations directly to the sessions objective.

5. **Conclusion**:
   - Summarize the key takeaways and outline any next steps.

---

### Style and Tone:

- **Professional and Clear**: Use concise and precise language.
- **Accessible**: Avoid jargon; ensure readability for a general audience.
- **Well-Formatted**: 
   - Use headers, bullet points, and bold/italic text for clarity and emphasis.
   - Include logical breaks between sections for easy navigation.

### Additional Notes:

- Prioritize recurring themes or insights if participant data is extensive.
- Flag any incomplete or conflicting responses for host review.
- Ensure that the report ties all findings back to the stated **OBJECTIVE** (next message).

---`;

export async function generateMultiSessionSummary(sessionIds: string[]) {
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
      ],
    });

    return response.message.content;
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
