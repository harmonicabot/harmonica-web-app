import {
  ApiAction,
  AssistantMessageData,
  OpenAIMessage,
  RequestData,
} from '@/lib/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 200;
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const data: RequestData = await req.json();

  switch (data.action) {
    case ApiAction.CreateThread:
      return handleCreateThread(data.data as Array<OpenAIMessage>);
    case ApiAction.GenerateAnswer:
      return handleGenerateAnswer(data.data as AssistantMessageData);
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleCreateThread(messagesData: Array<OpenAIMessage>) {
  const thread = await client.beta.threads.create({
    messages: messagesData.map((messageData) => ({
      role: messageData.role,
      content: messageData.content,
    })),
  });

  return NextResponse.json({ thread: thread });
}

async function handleGenerateAnswer(messageData: AssistantMessageData) {
  const message = await client.beta.threads.messages.create(
    messageData.threadId,
    {
      role: 'user',
      content: messageData.messageText,
    },
  );

  let run = await client.beta.threads.runs.createAndPoll(messageData.threadId, {
    assistant_id: messageData.assistantId,
    instructions: '',
  });

  if (run.status === 'completed') {
    const messages = await client.beta.threads.messages.list(run.thread_id);

    return NextResponse.json({
      messages: messages.data.reverse().map((messageData) => ({
        type: messageData.assistant_id ? 'ASSISTANT' : 'USER',
        text:
          messageData.content[0].type === 'text'
            ? messageData.content[0].text?.value
            : '',
        dateTime: messageData.created_at,
      })),
    });
  }
  return NextResponse.json({ messages: [] });
}
