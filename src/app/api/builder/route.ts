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
  handleResponse,
  streamResponse,
  waitForRunCompletion,
} from '../utils';

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
      return await handleCreateAssistant(request.data as AssistantBuilderData);
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

async function getTempAssistants() {
  // Currently unused, but could be used to periodically clean up or so.
  const assistants = await client.beta.assistants.list({
    limit: 100 /*, after: "asst_someId"*/,
  });
  console.log(
    `Found assistants:\n${assistants.data.map((assistant) => assistant.name + ' ' + assistant.id).join('\n')}`,
  );
  const tempAssistantIds = assistants.data
    .filter((assistant) => assistant.name!.startsWith('testing_'))
    .map((assistant) => assistant.id);
  return tempAssistantIds;
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

function createPromptContent(data: SessionBuilderData) {
  const createSummaryInstructions = data.createSummary
    ? 'Create a summary of the conversation at the end.'
    : '';
  const allowIterationsOnSummary = data.summaryFeedback
    ? 'Ask the user whether the summary is accurate and iterate on it if necessary.'
    : '';
  const includeContextInstructions = data.requireContext
    ? `When the session is started, the host will provide context about: ${data.contextDescription}. Use this as [CONTEXT] where appropriate.`
    : '';

  return `
    Create a template with the following information:
    Session Name: ${data.sessionName}
    Task Description: ${data.goal}
    Critical to understand: ${data.critical ? data.critical : ''}
    Context: ${data.context ? data.context : ''}
    ${createSummaryInstructions}
    ${allowIterationsOnSummary}
    ${includeContextInstructions}
  `;
}

async function handleCreateAssistant(data: AssistantBuilderData) {
  // console.log('Creating assistant for data: ', data);

  const assistant = await client.beta.assistants.create({
    name: data.name,
    instructions: data.prompt,
    model: 'gpt-4o-mini',
  });
  return NextResponse.json({ assistantId: assistant.id });
}
