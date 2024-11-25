'use server';
import { handleCreateThread, handleGenerateAnswer, sendMessage } from "./gptUtils";

export async function formatForExport(context: string[], exportInstructions: string) {
  console.log(`Creating thread...`);
  const threadId = await handleCreateThread({
    role: 'assistant',
    content: exportInstructions + '\n\nThe chat history for the export will follow:\n-----START USER CHATS-----\n',
  });    
  
  for (const message of context) {
    await sendMessage(threadId, 'assistant', '\n---- NEXT USER CHAT: ----\n'+ message + '\n---- END USER CHAT ----\n');
  }

  console.log(`Got threadID: ${threadId}; asking AI to format data...`);
  const answer = await handleGenerateAnswer({
    threadId: threadId,
    assistantId: process.env.EXPORT_ASSISTANT ?? 'asst_bat7RPhD81IFkNDU9VLuQnn4', // Dev assistant
    messageText: `Now export the data according to the initial instructions to JSON.`,
  });
  return answer.content;
}