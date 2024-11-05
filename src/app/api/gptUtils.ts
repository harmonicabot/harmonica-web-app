import { AssistantMessageData, OpenAIMessage } from "@/lib/types";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleCreateThread(messagesData: Array<OpenAIMessage>) {
  const thread = await client.beta.threads.create({
    messages: messagesData.map((messageData) => ({
      role: messageData.role,
      content: messageData.content,
    })),
  });

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