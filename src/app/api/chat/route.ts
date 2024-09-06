import { ApiAction, AssistantMessageData, RequestData } from '@/lib/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const data: RequestData = await req.json();

  switch (data.action) {
    case ApiAction.CreateThread:
      return handleCreateThread();
    case ApiAction.GenerateAnswer:
      return handleGenerateAnswer(data.data as AssistantMessageData);
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleCreateThread() {
  const thread = await client.beta.threads.create();

  return NextResponse.json({ thread: thread });
}

async function handleGenerateAnswer(messageData: AssistantMessageData) {
  const message = await client.beta.threads.messages.create(
    messageData.thredId,
    {
      role: 'user',
      content: messageData.messageText,
    },
  );

  let run = await client.beta.threads.runs.createAndPoll(messageData.thredId, {
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
