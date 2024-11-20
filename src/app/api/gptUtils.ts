'use server';
import { Message, NewMessage } from "@/lib/schema_updated";
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

export async function handleGenerateAnswer(messageData: AssistantMessageData): Promise<NewMessage[]> {
  await sendMessage(messageData.threadId, 'user', messageData.messageText);

  let run = await client.beta.threads.runs.createAndPoll(messageData.threadId, {
    assistant_id: messageData.assistantId,
    instructions: '',
  });

  if (run.status === 'completed') {
    const allMessages = await getAllMessages(messageData.threadId);

    return allMessages.map((messageData) => ({
      role: messageData.assistant_id ? 'assistant' : 'user',
      content:
        messageData.content[0].type === 'text'
          ? messageData.content[0].text?.value
          : '',
      thread_id: messageData.thread_id,
      created_at: new Date(messageData.created_at),
    }));
  }
  return [];
}

export async function sendMessage(threadId: string, role: 'user' | 'assistant', content: string) {
  return await client.beta.threads.messages.create(
    threadId,
    {
      role,
      content,
    }
  );
}

async function getAllMessages(threadId: string) {
  let allMessages = [];
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

export async function deleteAssistants(idsToDelete: string[]) {
  idsToDelete.forEach((id) => {
    console.log(`Deleting assistant with id ${id}`);
    client.beta.assistants.del(id);
  });
}
