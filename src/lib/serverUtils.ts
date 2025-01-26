'use server';
import * as db from './db';
import * as gpt from 'app/api/gptUtils';
import { Message } from './schema';
import { UserProfile } from '@auth0/nextjs-auth0/client';

import {
  Document,
  MetadataMode,
  NodeWithScore,
  VectorStoreIndex,
} from 'llamaindex';

export async function isAdmin(user: UserProfile) {
  console.log('Admin IDs: ', process.env.ADMIN_ID);
  return (process.env.ADMIN_ID || '').indexOf(user.sub ?? 'NO USER') > -1;
}

// Define the type for the grouped chats
interface GroupedChats {
  [threadId: string]: Message[];
}

export async function getAssistantId(
  assistant:
    | 'RESULT_CHAT_ASSISTANT'
    | 'EXPORT_ASSISTANT'
    | 'TEMPLATE_BUILDER_ID'
    | 'SUMMARY_ASSISTANT',
) {
  const result = process.env[assistant];
  if (result) return result;
  throw new Error(`Missing ${assistant}`);
}

export async function createSummary(sessionId: string) {
  console.log(`Creating summary for ${sessionId}...`);
  const messageStats = await db.getNumUsersAndMessages([sessionId]);
  const allUsers = await db.getUsersBySessionId(sessionId, [
    'id',
    'thread_id',
    'include_in_summary',
  ]);
  const onlyIncludedUsersWithAtLeast2Messages = allUsers.filter(
    (usr) =>
      usr.include_in_summary &&
      messageStats[sessionId][usr.id].num_messages > 2,
  );
  console.log(
    'Users with contributions to summary: ',
    onlyIncludedUsersWithAtLeast2Messages.length,
  );

  const chats = await db.getAllMessagesForUsersSorted(
    onlyIncludedUsersWithAtLeast2Messages,
  );
  const contextData = await db.getFromHostSession(sessionId, [
    'context',
    'critical',
    'goal',
    'topic',
  ]);
  // const prompt = contextData?.prompt

  // Flatten the chats and group by thread_id to distinguish participants
  const groupedChats: GroupedChats = chats.reduce((acc, chat) => {
    const participant = chat.thread_id; // Use thread_id to identify the participant
    if (!acc[participant]) {
      acc[participant] = [];
    }
    acc[participant].push(chat);
    return acc;
  }, {} as GroupedChats); // Type assertion for the accumulator

  // Create formatted messages for each participant
  const chatMessages = Object.entries(groupedChats).map(
    ([participantId, messages]) => {
      const participantMessages = messages
        .map((chat) => {
          return `${chat.role === 'user' ? 'User' : 'AI'}: ${chat.content}`;
        })
        .join(`\n\n`); // Join messages for the same participant
      return `\`\`\`\n----START Participant ${participantId}:----\n${participantMessages}\n\n----END Participant ${participantId}----\`\`\``; // Format for each participant
    },
  );

  const objectiveData = `\`\`\`This is the context, including the **OBJECTIVE**, used to create the session.\n
  Use this information to design an appropriate report structure:\n\n
  ----START OBJECTIVE DATA----\n
  ${JSON.stringify(contextData)}
  \n----END OBJECTIVE DATA----\n\`\`\``;
  // console.log('Sending prompt to GPT-4: ', promptForObjective);
  const threadId = await gpt.handleCreateThread(
    {
      role: 'assistant',
      content: 'Use the following messages as context for user input.',
    },
    [...chatMessages, objectiveData],
  );

  // Create Document object with essay
  const document = new Document({
    text: objectiveData,
    metadata: {
      type: 'objective',
    },
  });

  // Create Document object with chat messages
  const chatDocuments = chatMessages.map(
    (message) =>
      new Document({
        text: message,
        metadata: {
          type: 'chat',
        },
      }),
  );

  // Split text and create embeddings. Store them in a VectorStoreIndex
  const index = await VectorStoreIndex.fromDocuments([
    document,
    ...chatDocuments,
  ]);

  const query = `Generate a structured **REPORT** based on all participant session transcripts (provided in a separate message). The report must address the stated **OBJECTIVE** (provided in a separate message) of the session and follow the formatting and style guidance below.

---
### Report Structure:

1. **Introduction**:
   - Briefly restate the session objective and purpose.
   - Provide context or background if necessary.

2. **Key Themes**:
   - Summarize the most common and important points raised by participants.
   - Organize responses into clear themes or categories.

3. **Divergent Opinions**:
   - Highlight significant areas of disagreement or unique insights that deviate from the common themes.
    
4. **Actionable Insights**:
   - Derive clear, actionable recommendations based on participant inputs.
   - Where possible, link these recommendations directly to the sessions objective.

5. **Conclusion**:
   - Summarize the key takeaways and outline any next steps.

---

### Style and Tone:

- **Professional and Clear**: Use concise and precise language.
- **Accessible**: Avoid jargon; ensure readability for a general audience.
- **Well-Formatted**: 
   - Use headers, bullet points, and bold/italic text for clarity and emphasis.
   - Include logical breaks between sections for easy navigation.

### Additional Notes:

- Prioritize recurring themes or insights if participant data is extensive.
- Flag any incomplete or conflicting responses for host review.
- Ensure that the report ties all findings back to the stated **OBJECTIVE** (next message).

---`;

  // Query the index
  const queryEngine = index.asQueryEngine();
  const { response, sourceNodes } = await queryEngine.query({
    query: query,
  });

  // Output response with sources
  console.log('[i] Output response with sources: ', response);

  if (sourceNodes) {
    sourceNodes.forEach((source: NodeWithScore, index: number) => {
      console.log(
        `\n${index}: Score: ${source.score} - ${source.node.getContent(MetadataMode.NONE).substring(0, 50)}...\n`,
      );
    });
  }

  // const summaryReply = await gpt.handleGenerateAnswer({
  //   threadId: threadId,
  //   assistantId:
  //     process.env.SUMMARY_ASSISTANT ?? 'asst_QTmamFSqEIcbUX4ZwrjEqdm8',
  //   messageText:
  //     'Generate the report based on the participant data provided addressing the objective.',
  // });
  // const summary = summaryReply.content;
  // console.log('Summary: ', summary);

  const summary = 'test';

  await db.updateHostSession(sessionId, {
    summary: response ?? undefined,
    last_edit: new Date(),
  });
}
