'use server';
import { NewMessage } from '@/lib/schema_updated';
import { AssistantBuilderData, AssistantMessageData, OpenAIMessage } from '@/lib/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleCreateAssistant(data: AssistantBuilderData) {
  // console.log('Creating assistant for data: ', data);
  const assistant = await client.beta.assistants.create({
    name: data.name,
    instructions: data.prompt,
    model: 'gpt-4o-mini',
  });
  return assistant.id;
}

export async function handleCreateThread(
  messageData?: OpenAIMessage,
  additionalContext?: string[],
) {
  if (messageData) {
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: messageData.role,
          content: messageData.content,
        },
      ],
    });

    for (const context of additionalContext ?? []) {
      await sendMessage(thread.id, 'assistant', context);
    }
    return thread.id;
  } else {
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: 'assistant',
          content: 'First message from assistant',
        },
      ],
    });

    for (const context of additionalContext ?? []) {
      await sendMessage(thread.id, 'assistant', context);
    }

    return thread.id;
  }
}

export async function handleGenerateAnswer(
  messageData: AssistantMessageData,
): Promise<NewMessage> {
  await sendMessage(messageData.threadId, 'user', messageData.messageText);

  try {
    let run = await client.beta.threads.runs.createAndPoll(
      messageData.threadId,
      {
        assistant_id: messageData.assistantId,
      },
    );

    if (run.status === 'completed') {
      const answer = await getLastReply(messageData.threadId);
      console.log('Answer from AI: ', answer);

      return {
        thread_id: messageData.threadId,
        role: answer.assistant_id ? 'assistant' : 'user',
        content:
          answer.content[0].type === 'text'
            ? answer.content[0].text?.value
            : '',
        created_at: new Date(),
      };
    } else {
      console.error(
        `OpenAI run.status for thread ${messageData.threadId}: `,
        run.status,
      );
      throw new Error(
        `OpenAI run.status for thread ${messageData.threadId}: ` + run.status,
      );
    }
  } catch (error) {
    console.error('Error getting answer from OpenAI:', error);
    throw new Error(`Error getting answer from OpenAI: ${error}`);
  }
}

export async function sendMessage(
  threadId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  return await client.beta.threads.messages.create(threadId, {
    role: role,
    content: content,
  });
}

async function getAllMessages(threadId: string) {
  let allMessages = [];
  let cursor: string | undefined = undefined;

  while (true) {
    console.log('iterating over answers...');
    const messages: OpenAI.Beta.Threads.Messages.MessagesPage =
      await client.beta.threads.messages.list(threadId, {
        limit: 100,
        after: cursor,
        order: 'asc',
      });

    allMessages.push(...messages.data);

    if (!messages.data || messages.data.length === 0) break;
    cursor = messages.data[messages.data.length - 1].id;
  }

  return allMessages;
}

export async function getGPTCompletion(instructions: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: instructions }],
      model: 'gpt-4o-mini',
    });

    return completion.choices[0].message.content ?? '';
  } catch (error) {
    console.error('Error getting answer:', error);
    throw error;
  }
}

async function getLastReply(threadId: string) {
  return (
    await client.beta.threads.messages.list(threadId, {
      limit: 1,
      order: 'desc',
    })
  ).data[0];
}

export async function deleteAssistants(idsToDelete: string[]) {
  idsToDelete.forEach((id) => {
    console.log(`Deleting assistant with id ${id}`);
    client.beta.assistants.del(id);
  });
}

export async function handleResponse(
  client: OpenAI,
  threadId: string,
  assistantId: string,
  instructions: string,
  stream: boolean,
) {
  if (stream) {
    const streamData = streamResponse(
      client,
      threadId,
      assistantId,
      instructions,
    );
    return new NextResponse(streamData, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } else {
    const response = await finishedResponse(
      client,
      threadId,
      assistantId,
      instructions,
    );
    console.log('response from finishedResponse:', response);
    return NextResponse.json({ fullPrompt: response });
  }
}

export async function finishedResponse(
  client: OpenAI,
  threadId: string,
  assistantId: string,
  instructions: string,
) {
  console.log('threadId:', threadId);
  console.log('assistantId:', assistantId);
  console.log('instructions:', instructions);

  await client.beta.threads.messages.create(threadId, {
    role: 'user',
    content: instructions,
  });

  const run = await client.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });
  await waitForRunCompletion(client, threadId, run.id);

  const messages = await client.beta.threads.messages.list(threadId);
  const content = getTextContent(messages.data[0].content);
  console.log('Generated FullPrompt Content: ', content);

  return content;
}

export async function waitForRunCompletion(
  client: OpenAI,
  threadId: string,
  runId: string,
) {
  while (true) {
    const run = await client.beta.threads.runs.retrieve(threadId, runId);
    if (run.status === 'completed') {
      return;
    } else if (run.status === 'failed' || run.status === 'cancelled') {
      throw new Error(`Run ${runId} ${run.status}`);
    }
    // Wait for 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function streamResponse(
  client: OpenAI,
  threadId: string,
  assistantId: string,
  instructions: string,
) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      await client.beta.threads.messages.create(threadId, {
        role: 'user',
        content: instructions,
      });

      const run = await client.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      while (true) {
        const runStatus = await client.beta.threads.runs.retrieve(
          threadId,
          run.id,
        );

        if (runStatus.status === 'completed') {
          const messages = await client.beta.threads.messages.list(threadId);
          const content = getTextContent(messages.data[0].content);
          controller.enqueue(encoder.encode(content));
          break;
        } else if (
          runStatus.status === 'failed' ||
          runStatus.status === 'cancelled'
        ) {
          controller.error('Run failed or was cancelled');
          break;
        }

        // If the run is still in progress, we can optionally send partial results here
        // For now, we'll just wait and check again
        console.log(
          'Waiting for status update. Run Status: ',
          runStatus.status,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      controller.close();
    },
  });
}

function getTextContent(
  content: OpenAI.Beta.Threads.Messages.MessageContent[],
): string {
  const textContent = content.find((item) => item.type === 'text');
  if (textContent && 'text' in textContent) {
    return textContent.text.value;
  }
  throw new Error('No text content found in the message');
}
