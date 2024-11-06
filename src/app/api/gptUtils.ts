import { AssistantMessageData, OpenAIMessage } from "@/lib/types";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleCreateThread(messagesData?: Array<OpenAIMessage>) {
  let thread;
  if (messagesData) {
    thread = await client.beta.threads.create({
      messages: messagesData.map((messageData) => ({
        role: messageData.role,
        content: messageData.content,
      })),
    });
  } else {
    thread = await client.beta.threads.create();
  }

  return NextResponse.json({ thread: thread });
}

export async function handleGenerateAnswer(messageData: AssistantMessageData) {
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
    const allMessages = await getAllMessages(messageData.threadId);

    return NextResponse.json({
      messages: allMessages.map((messageData) => ({
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

async function getAllMessages(threadId: string) {
  let allMessages: any[] = [];
  let cursor: string | undefined = undefined;
  
  while (true) {
    console.log("iterating over answers...")
    const messages: OpenAI.Beta.Threads.Messages.MessagesPage = await client.beta.threads.messages.list(
      threadId, 
      { 
        limit: 100,
        after: cursor, 
        order: 'asc'
      }
    );
    
    allMessages.push(...messages.data);
    
    if (!messages.data || messages.data.length === 0) break;
    cursor = messages.data[messages.data.length - 1].id;
  }
  
  return allMessages;
}

export async function generateAnswer(instructions: string, assistant_id: string) {
  const threadResponse = await handleCreateThread()
  const threadId = (await threadResponse.json()).thread.id;
  const answers = await handleGenerateAnswer({
    threadId: threadId,
    assistantId: assistant_id,
    messageText: instructions,
  });
  return (await answers.json())[0]
}

async function extractAndFormatForExport(messages: string[], exportDataQuery: string) {
  console.log(`Creating thread...`);
  const threadResponse = await handleCreateThread([{
    role: 'assistant',
    content: `Any exported data should be derived from information from the following chat history: 
##### START of CHAT HISTORY #####
${messages.join(' --- next USER ---')}
##### END of CHAT HISTORY #####`,
  }]);
    
  const threadId = (await threadResponse.json()).thread.id;
  
  console.log(`Got threadID: ${threadId}; asking AI to format data...`);
  const answerResponse = await handleGenerateAnswer({
    threadId: threadId,
    assistantId: 'asst_DAO97DuTb6856Z5eFqa8EwaP', // Export Agent
    messageText:
`Get information from the chat and export it as JSON to satisfy the following:

\`\`\`${JSON.stringify(exportDataQuery)}\`\`\`

ONLY return the plain JSON in your answer, without any additional text! Don't even include a \`\`\`json [...] \`\`\`\n`,
  });
  const answers = (await answerResponse.json()).messages;
  console.log(`Got answers: ${JSON.stringify(answers)}`);
  const lastReplyFromAI = answers[answers.length-1].text;
  return lastReplyFromAI;
}
