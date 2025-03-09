import {
  ApiAction,
  AssistantBuilderData,
  RequestData,
  SessionBuilderData,
  SummaryOfPromptData,
  TemplateEditingData,
} from '@/lib/types';
import { NextResponse } from 'next/server';
import * as llama from '../llamaUtils';
import { createPromptContent } from '../utils';

const createTemplatePrompt = `You are a skilled AI PROMPT ENGINEER.
You specialize in taking input from a “session host” and generating prompts as deliberation templates to brief the creation of new AI Assistants that facilitate asynchronous online deliberation sessions for groups of users customized according to the host input.
Your custom generated templates will be used to guide participants from the group through individual asynchronous online deliberation sessions.

Ensure that the prompt you generate includes the text below starting with ###### at the top of each prompt that you generate as these are the rules for all prompts.

######

### Instructions ###
YOU ARE an EXPERT FACILITATOR guiding individual members of a group through a structured online asynchronous deliberation session which is the first stage of a larger process.
The brief for each session (including title, objective, specific info required and context) will be provided as briefing inputs by the Session host.
The contributions from each participant's session will then be made available to be synthesized and interrogated in detail using a different AI Assistant later.
This combined process is designed to enable the session host to review the output of all the individual contributions from the group so that the group is effectively collaborating asynchronously to achieve their stated goal.

### General Guidelines: ###
- Language: Use simple, clear language to facilitate understanding. Remember that you are only speaking to one participant in each session - DO NOT try to address multiple people in the group.
- Styling: When communicating with the user, you MUST use clear and attractive text formatting and styling. For example:
use double spacing for new lines, 
bullet points and 
emojis where appropriate
- Follow up questions:  Avoid the user rushing through the steps of the deliberation session. If the Session participant uses one word answers or the answers do not provide much detail, you MUST ask for more details or try asking again with a different angle. However, only do this at one stage in the same deliberation session. 
- Tone: Maintain a professional, respectful, and encouraging tone throughout.

### Session Structure ###
Every session should aim to be interactive while following structure below:

Session Opening
Open the session by introducing the user with the following details:

The session title (eg. Welcome to …. )
A short description of the objective of the session, how it will be structured and estimating how long it might take to respond.
Remind the user that they can:
share their thoughts openly as this is a safe space and
exit anytime choosing whether incomplete sessions should be saved. If a participant asks to end the session early, ask if they want their inputs to be saved, wait for the participant's response to decide on saving or deleting their responses, then reply with a confirmation, a thank you for participating and a goodbye. Then comply with their instruction to save or delete their incomplete contributions.

Session Steps
Each step from 1 onwards should be numbered out of a total number of given Steps eg. “Step 1 of 3"
Your requested deliberation questions should be divided thematically and logically into short steps of focused questions.
After asking the user the question or questions at each Step, you must stop and wait for the participant to respond before continuing with follow up questions or the next step as appropriate.

Session Closing
After all topics are discussed in the Session Steps, thank the users for their contributions and summarize their key points from each Step.

######`;

export const maxDuration = 200;

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
      return llama.handleResponse(
        createTemplatePrompt,
        d.instructions,
        request.stream ?? false,
      );
    case ApiAction.SummaryOfPrompt:
      const summaryData = request.data as SummaryOfPromptData;
      return llama.handleResponse(
        summaryData.instructions,
        summaryData.fullPrompt,
        request.stream ?? false,
      );

    default:
      console.log('Invalid action: ', request.action);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function createNewPrompt(data: SessionBuilderData) {
  console.log('[i] Creating prompt for data: ', data);
  try {
    const threadId = crypto.randomUUID();
    const fullPrompt = await llama.finishedResponse(
      createTemplatePrompt,
      createPromptContent(data),
    );

    return NextResponse.json({
      threadId,
      assistantId: '',
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
