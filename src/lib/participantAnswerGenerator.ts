import { getLLM } from '@/lib/modelConfig';
import { getAllChatMessagesInOrder } from '@/lib/db';
import { NewMessage } from '@/lib/schema';

interface AnswerGeneratorConfig {
  threadId: string;
  temperature?: number;
}

const TEAM_MEMBER_PROMPT = `You are a creative UI/UX lead participating in this discussion. Follow these guidelines:

1. Respond as an experienced, innovative UI/UX designer
2. Draw from the current session context to provide relevant, specific responses
3. When asked about past experiences (like sprint retrospectives), share observations as if you were directly involved
4. Base your responses on the specific details mentioned in the conversation history
5. Use natural, conversational language with occasional design terminology

Your personality traits:
- User-centered and empathetic
- Reflective and observant
- Slightly informal but professional
- Values both aesthetics and functionality

When responding:
1. Keep answers VERY concise (1-2 sentences maximum)
2. Be direct and to the point
3. Reference specific events, tools, or interactions from the conversation
4. For retrospective questions, focus on sharing personal observations rather than giving advice
5. Respond directly to the content of the previous message
6. If asked about what worked well or challenges, mention specific design activities, collaboration moments, or tools used

IMPORTANT: Your responses must be extremely brief, focused, and directly relevant to the conversation. Use session data to ground your responses in the specific context of the discussion.`;

export async function generateParticipantAnswer(
  config: AnswerGeneratorConfig,
): Promise<NewMessage> {
  try {
    const { threadId, temperature = 0.7 } = config;

    // Initialize LLM with SMALL model configuration
    const llm = getLLM('SMALL', temperature);
    console.log(`[i] Generating participant answer for thread: ${threadId}`);

    // Get all messages in the thread
    const messages = await getAllChatMessagesInOrder(threadId);

    if (!messages || messages.length === 0) {
      throw new Error('No messages found in thread');
    }

    // Get the last message to respond to
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role !== 'assistant') {
      console.log('[i] Last message is from user, generating response to it');
    } else {
      console.log(
        '[i] Last message is from assistant, will respond to previous user message',
      );
    }

    // Format conversation history for context
    const conversationHistory = messages
      .map(
        (msg) =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`,
      )
      .join('\n\n');

    // Generate response using configured LLM
    const response = await llm.chat({
      messages: [
        {
          role: 'system',
          content: TEAM_MEMBER_PROMPT,
        },
        {
          role: 'user',
          content: `Here's the conversation so far:\n\n${conversationHistory}\n\nRespond as a creative team member to the most recent message. BE VERY BRIEF (1-2 sentences) and DIRECTLY ADDRESS the content of the last message.`,
        },
      ],
      tag: 'simulated_participant',
    });

    const participantResponse = response
      || 'I need more information to provide a helpful response.';

    console.log('[i] Generated participant response:', participantResponse);

    // Create and return the new message
    const newMessage: NewMessage = {
      thread_id: threadId,
      role: 'user',
      content: participantResponse,
      created_at: new Date(),
    };

    return newMessage;
  } catch (error) {
    console.error('[x] Participant answer generation error:', error);

    // Return a fallback message in case of error
    return {
      thread_id: config.threadId,
      role: 'user',
      content:
        'As a UI/UX designer, I think we should explore this idea further with some quick wireframes. The user flow you described could benefit from visual exploration.',
      created_at: new Date(),
    };
  }
}
