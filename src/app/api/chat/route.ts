import {
  ApiAction,
  AssistantMessageData,
  OpenAIMessage,
  RequestData,
} from '@/lib/types';
import { NextResponse } from 'next/server';
import { handleCreateThread, handleGenerateAnswer } from '../gptUtils';

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