import { RequestData } from "@/lib/types";
import { NextResponse } from "next/server";
import { handleCreateThread, handleGenerateAnswer } from "../gptUtils";

// Expected: { sessionId: string, exportDataQuery: string }

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
