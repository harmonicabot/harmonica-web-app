import {
  ApiAction,
  AssistantBuilderData,
  RequestData,
  SessionBuilderData,
  TemplateEditingData,
} from '@/lib/types';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  finishedResponse,
  handleCreateAssistant,
  handleResponse,
} from '../gptUtils';
import { createPromptContent } from '../utils';

export const maxDuration = 200;
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const request: RequestData = await req.json();
  // Todo: We should possibly switch this to always use 'handleResponse',
  //  so that we can easier switch between streaming and not. But not now.
  console.log('Action: ', request.action);
  switch (request.action) {
    case ApiAction.CreatePrompt:
      return await createNewPrompt(request.data as SessionBuilderData);
    case ApiAction.EditPrompt:
      // console.log('Editing prompt for data: ', data.data);
      const d = request.data as TemplateEditingData;
      return handleResponse(
        client,
        d.threadId,
        d.assistantId,
        d.instructions,
        request.stream ?? false,
      );
    case ApiAction.CreateAssistant:
      return NextResponse.json({ assistantId: await handleCreateAssistant(request.data as AssistantBuilderData) });
    case ApiAction.DeleteAssistants:
      if (typeof request.data === 'object' && 'assistantIds' in request.data && Array.isArray(request.data.assistantIds)) {
        return await deleteAssistants(request.data.assistantIds);
      } else {
        return NextResponse.json({ error: 'Invalid data format for DeleteAssistants' }, { status: 400 });
      }
    default:
      console.log('Invalid action: ', request.action);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function createNewPrompt(data: SessionBuilderData) {
  const templateBuilderId = process.env.TEMPLATE_BUILDER_ID;
  if (!templateBuilderId) {
    return NextResponse.json(
      { error: 'Template builder not set!' },
      { status: 500 },
    );
  }

  console.log(
    'Creating prompt for data: ',
    data,
    templateBuilderId,
  );
  try { 
    const [threadId, fullPrompt] = await generateFullPrompt(
      data,
      templateBuilderId,
    );
    return NextResponse.json({
      threadId,
      assistantId: templateBuilderId,
      fullPrompt: fullPrompt,
    });
  } catch (error) {
    console.error('Error in creating new prompt:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

async function deleteAssistants(idsToDelete: string[]) {
  idsToDelete.forEach((id) => {
    console.log(`Deleting assistant with id ${id}`);
    client.beta.assistants.del(id);
  });
  return NextResponse.json({ success: true }, { status: 200 });
}

async function generateFullPrompt(
  data: SessionBuilderData,
  assistantId: string,
) {
  const thread = await client.beta.threads.create();
  const content = await finishedResponse(
    client,
    thread.id,
    assistantId,
    createPromptContent(data),
  );
  return [thread.id, content];
}
