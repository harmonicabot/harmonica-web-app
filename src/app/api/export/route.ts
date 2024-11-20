import { RequestData } from "@/lib/types";
import { NextResponse } from "next/server";
import { handleCreateThread, handleGenerateAnswer, sendMessage } from "../gptUtils";

// Expected: { sessionId: string, exportDataQuery: string }
export const maxDuration = 200;

export type ExportRequest = Request & RequestData & {
  data: {
    chatMessages: string[];
    exportDataQuery: string;
  }
};
export async function POST(request: ExportRequest) {
  const data = (await request.json()).data;  
  // Todo: check authorization. (Actually, we should really do that for _all_ APIs... :-/ )
  
  // Request should have a sessionId at the very least, and then some description or fields of what to export.
  // We'll get the session data, then instruct AI to format it as JSON in the desired format and return it.
  console.log(`Received request: `, data);

  const exportData = await extractAndFormatForExport(data.chatMessages, data.exportDataQuery);
  console.log(`Export data: `, exportData);
  return new NextResponse(exportData, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="export_${data.sessionId}.json"`,
    },
  });
}

async function extractAndFormatForExport(messages: string[], exportDataQuery: string) {
  console.log(`Creating thread...`);
  const thread = await handleCreateThread([{
    role: 'assistant',
    content: `Any exported data should be derived from information from the following chat history (you will receive each users history as separate instruction). 
##### START of CHAT HISTORY #####`,
  }]);    
  const threadId = thread.id;
  
  for (const message of messages) {
    await sendMessage(threadId, 'assistant', '\n---- NEXT USER: ----\n'+ message);
  }


  console.log(`Got threadID: ${threadId}; asking AI to format data...`);
  const answer = await handleGenerateAnswer({
    threadId: threadId,
    assistantId: 'asst_DAO97DuTb6856Z5eFqa8EwaP', // TODO: This is a random assistant; we don't actually need one, or we should create one!
    messageText:
`Get information from the chat and export it as JSON to satisfy the following:

\`\`\`${JSON.stringify(exportDataQuery)}\`\`\`

ONLY return the plain JSON in your answer, without any additional text! Don't even include a \`\`\`json [...] \`\`\`\n`,
  });
  return answer.content;
}
