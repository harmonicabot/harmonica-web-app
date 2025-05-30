import { getLLM } from '@/lib/modelConfig';
import { Message, UserSession } from '@/lib/schema';
import { getPromptInstructions } from '../promptsCache';

/**
 * Extracts structured data from user messages using configured LLM
 * @param context Array of conversation strings to analyze
 * @param exportInstructions Instructions for how to extract and format the data
 * @returns Formatted string with structured data (typically JSON)
 */
export async function extractDataWithLlama(
  context: string[],
  exportInstructions: string,
): Promise<string> {
  try {
    // Initialize LLM with MAIN model (using lower temperature for structured output)
    const chatEngine = getLLM('LARGE', 0.3);

    // Format context and instructions
    const formattedContext =
      '--- START USER CONVERSATION: ---\n\n' +
      context.join('\n\n--- NEXT USER CONVERSATION: ---\n\n');
    console.log(
      `[llamaExport] Processing ${context.length} conversations for structured data extraction`,
    );

    const extractPrompt = await getPromptInstructions('EXTRACT_PROMPT');
    const extractUserPrompt = await getPromptInstructions(
      'EXTRACT_USER_PROMPT',
    );

    // Get the response
    const response = await chatEngine.chat({
      messages: [
        {
          role: 'system',
          content: extractPrompt,
        },
        {
          role: 'user',
          content: exportInstructions,
        },
        {
          role: 'user',
          content: `Here are the conversations to extract data from:\n\n${formattedContext}\n\n${extractUserPrompt}`,
        },
      ],
    });

    // Clean the response if it includes markdown code blocks
    let content = response;

    // Remove markdown code blocks if present (```json ... ```)
    if (content.includes('```')) {
      // Extract content between code block markers
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        content = codeBlockMatch[1].trim();
      } else {
        // If regex failed but we know there are backticks, try simpler approach
        content = content
          .replace(/```(?:json)?/g, '')
          .replace(/```/g, '')
          .trim();
      }
    }

    return content;
  } catch (error) {
    console.error('[llamaExport] LlamaIndex error:', error);
    return JSON.stringify({ error: `Failed to extract data: ${error}` });
  }
}

/**
 * Formats user messages into chat history suitable for analysis
 * @param userData Array of user sessions
 * @param allMessages All messages from the user sessions
 * @returns Array of concatenated conversation strings
 */
export function formatMessagesForExport(
  userData: UserSession[],
  allMessages: Message[],
): string[] {
  // Group messages by thread
  const messagesByThread = allMessages.reduce(
    (acc, message) => {
      acc[message.thread_id] = acc[message.thread_id] || [];
      acc[message.thread_id].push(message);
      return acc;
    },
    {} as Record<string, Message[]>,
  );

  // Format each thread as a conversation string
  return Object.entries(messagesByThread).map(([threadId, messages]) =>
    concatenateMessages(messages),
  );
}

/**
 * Concatenates messages from a single user into a readable format
 * @param messagesFromOneUser Array of messages from a single user/thread
 * @returns Formatted string of messages
 */
function concatenateMessages(messagesFromOneUser: Message[]): string {
  messagesFromOneUser.sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime(),
  );
  return messagesFromOneUser
    .map((message) => `${message.role} : ${message.content}`)
    .join('\n');
}
