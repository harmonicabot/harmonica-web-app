'use server';

import { NewMessage } from '@/lib/schema';
import { AssistantMessageData } from '@/lib/types';
import { ChatMessage, Gemini } from 'llamaindex';
import { NextResponse } from 'next/server';
import { getAllChatMessagesInOrder, getHostSessionById } from '@/lib/db';
import { GEMINI_MODEL } from 'llamaindex';
import { initializeCrossPollination } from '@/lib/crossPollination';

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

// Add a new variable to track when we should skip cross-pollination
let skipCrossPollination = 0;

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

  const messages = messageData.threadId
    ? await getAllChatMessagesInOrder(messageData.threadId)
    : [];

  // Only attempt cross-pollination if there are enough messages and we're not in skip mode
  const shouldAttemptCrossPollination =
    messages.length >= 3 && skipCrossPollination <= 0;
  console.log(
    `[i] Message count: ${messages.length}, should attempt cross-pollination: ${shouldAttemptCrossPollination}, skip counter: ${skipCrossPollination}`,
  );

  if (
    shouldAttemptCrossPollination &&
    messageData.sessionId &&
    messageData.threadId
  ) {
    try {
      console.log('[i] Initializing cross-pollination manager');
      const crossPollination = await initializeCrossPollination(
        messageData.sessionId,
      );

      // Check if we should trigger cross-pollination
      console.log('[i] Analyzing session state for cross-pollination');

      // Use the manager's analyzeSessionState method with threadId
      const shouldCrossPollinate = await crossPollination.analyzeSessionState(
        messageData.threadId,
      );
      console.log(`[i] Should cross-pollinate: ${shouldCrossPollinate}`);

      if (shouldCrossPollinate) {
        console.log('[i] Cross-pollination triggered');

        // Set the skip counter to 2 (skip next two interactions)
        skipCrossPollination = 2;
        crossPollination.setLastCrossPollination();

        // Generate a cross-pollination question based on other threads
        const crossPollinationQuestion =
          await crossPollination.generateCrossPollinationQuestion(
            messageData.threadId,
          );

        // Return the cross-pollination question
        return {
          thread_id: messageData.threadId || '',
          role: 'assistant',
          content: `💡 Cross-pollination insight: ${crossPollinationQuestion}`,
          created_at: new Date(),
        };
      } else {
        console.log('[i] Cross-pollination not triggered for this message');
      }
    } catch (error) {
      console.error('[x] Error in cross-pollination:', error);
      // Continue with normal processing without cross-pollination
    }
  } else {
    // Decrement the skip counter if it's greater than 0
    if (skipCrossPollination > 0) {
      skipCrossPollination--;
      console.log(
        `[i] Skipping cross-pollination, counter decreased to: ${skipCrossPollination}`,
      );
    }
    console.log('[i] Not attempting cross-pollination for this message');
  }

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
