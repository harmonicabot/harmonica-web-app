'use server';

import { NewMessage } from '@/lib/schema';
import { AssistantMessageData } from '@/lib/types';
import { ChatMessage, Gemini } from 'llamaindex';
import { NextResponse } from 'next/server';
import { getAllChatMessagesInOrder, getHostSessionById } from '@/lib/db';
import { GEMINI_MODEL } from 'llamaindex';

const basicFacilitationPrompt = `You are a skilled facilitator helping guide productive discussions. Your role is to:

1. Keep discussions focused and on-topic
2. Ensure all participants have opportunities to contribute
3. Summarize key points and progress periodically
4. Ask clarifying questions when needed
5. Help resolve any misunderstandings or conflicts constructively
6. Maintain a respectful and inclusive environment

When responding:
- Be clear and concise
- Remain neutral and objective
- Acknowledge contributions positively
- Guide rather than dominate the conversation
- Help connect different viewpoints and ideas
- Keep track of time and progress toward session goals

If the discussion gets off track, gently redirect it back to the main topic. If you notice someone hasn't contributed in a while, create opportunities for them to share their thoughts.`;

export async function finishedResponse(
  systemPrompt: string,
  userPrompt: string,
) {
  console.log('[i] Generating finished response:', {
    systemPrompt,
    userPrompt,
  });

  const chatEngine = new Gemini({
    model: GEMINI_MODEL.GEMINI_2_0_FLASH_THINKING_EXP,
    temperature: 0.3,
  });

  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    console.log(
      '[i] Generating completion with messages:',
      JSON.stringify(messages, null, 2),
    );

    const response = await chatEngine.chat({
      messages: messages,
    });

    console.log('[i] Completion response:', response);
    return response.message.content.toString();
  } catch (error) {
    console.error('[x] Error in finishedResponse:', error);
    throw new Error(`Failed to generate response: ${error}`);
  }
}

export async function handleGenerateAnswer(
  messageData: AssistantMessageData,
): Promise<NewMessage> {
  console.log(`[i] Generating answer for message: `, messageData);

  // Get all messages for the current thread

  const messages = messageData.threadId
    ? await getAllChatMessagesInOrder(messageData.threadId)
    : [];
  console.log(`[i] Current thread messages:`, messages);

  // Get host session data directly using session_id
  if (!messageData.sessionId) {
    throw new Error('Session ID is required');
  }
  const sessionData = await getHostSessionById(messageData.sessionId);
  console.log(`[i] Session data:`, sessionData);

  // Format context data
  const sessionContext = `
System Instructions:
${sessionData?.prompt || basicFacilitationPrompt}

Session Information:
- Topic: ${sessionData?.topic || 'No topic specified'}
- Goal: ${sessionData?.goal || 'No goal specified'}
${sessionData?.context ? `- Background Context: ${sessionData.context}` : ''}
${sessionData?.critical ? `- Key Points: ${sessionData.critical}` : ''}`;

  const chatEngine = new Gemini({
    model: GEMINI_MODEL.GEMINI_2_0_FLASH_THINKING_EXP,
    temperature: 0.3,
  });

  const formattedMessages = [
    { role: 'system', content: sessionContext },
    ...messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user',
      content: messageData.messageText,
    },
  ];

  console.log('[i] Formatted messages:', formattedMessages);

  try {
    const response = await chatEngine.chat({
      messages: formattedMessages as ChatMessage[],
    });
    console.log('[i] Response:', response);
    return {
      thread_id: messageData.threadId || '',
      role: 'assistant',
      content: response.message.content.toString(),
      created_at: new Date(),
    };
  } catch (error) {
    console.error('[x] Error generating response:', error);
    return {
      thread_id: messageData.threadId || '',
      role: 'assistant',
      content: `I apologize, but I encountered an error processing your request. ${error}`,
      created_at: new Date(),
    };
  }
}

export async function handleResponse(
  systemPrompt: string,
  userPrompt: string,
  stream: boolean,
) {
  if (stream) {
    const streamData = streamResponse(systemPrompt, userPrompt);
    return new NextResponse(streamData, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } else {
    const response = await finishedResponse(systemPrompt, userPrompt);
    console.log('response from finishedResponse:', response);
    return NextResponse.json({ fullPrompt: response });
  }
}

function streamResponse(systemPrompt: string, userPrompt: string) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const chatEngine = new Gemini({
        model: GEMINI_MODEL.GEMINI_2_0_FLASH_THINKING_EXP,
        temperature: 0.3,
      });

      try {
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ];

        console.log(
          '[i] Starting stream with messages:',
          JSON.stringify(messages, null, 2),
        );

        const response = await chatEngine.chat({
          messages: messages,
        });

        if (response.message?.content) {
          const content = response.message.content.toString();
          controller.enqueue(encoder.encode(content));
        } else {
          controller.error('No content in response');
        }

        controller.close();
      } catch (error) {
        console.error('[x] Error in stream:', error);
        controller.error(`Stream failed: ${error}`);
      }
    },
  });
}
