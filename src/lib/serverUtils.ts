'use server';
import * as db from './db';
import * as gpt from 'app/api/gptUtils';
import { Message } from './schema';
import { UserProfile } from '@auth0/nextjs-auth0/client';

export async function isAdmin(user: UserProfile) {
  console.log('Admin IDs: ', process.env.ADMIN_ID);
  return (process.env.ADMIN_ID || '').indexOf(user.sub ?? 'NO USER') > -1;
}

// Define the type for the grouped chats
interface GroupedChats {
  [threadId: string]: Message[];
}

export async function createSummary(sessionId: string) {
  console.log(`Creating summary for ${sessionId}...`);
  const messageStats = await db.getNumUsersAndMessages([sessionId]);
  const allUsers = await db.getUsersBySessionId(sessionId, ['id', 'thread_id', 'include_in_summary']);
  const onlyIncludedUsersWithAtLeast2Messages =
    allUsers.filter(usr => usr.include_in_summary && messageStats[sessionId][usr.id].num_messages > 2)
  console.log('Users with contributions to summary: ', onlyIncludedUsersWithAtLeast2Messages.length);

  const chats = await db.getAllMessagesForUsersSorted(onlyIncludedUsersWithAtLeast2Messages);
  const prompt = await db.getFromHostSession(sessionId, 'prompt');

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
        .join(`\n----END Participant ${participantId}----\n`); // Join messages for the same participant
      return `\`\`\`\n----START Participant ${participantId}:----\n${participantMessages}\n\`\`\``; // Format for each participant
    },
  );

  const promptForObjective = `\`\`\`This is the original session prompt, it _contains_ the **OBJECTIVE** somewhere in its body.\n
  Look for the objective, and format the report to address the objective found in this prompt.\n\n
  ----START PROMPT----\n
  ${prompt}
  \n----END PROMPT----\n\`\`\``;
  // console.log('Sending chat history to GPT-4: ', chatMessages);
  const threadId = await gpt.handleCreateThread(
    {
      role: 'assistant',
      content: 'Use the following messages as context for user input.',
    },
    [...chatMessages, promptForObjective],
  );
  const summaryReply = await gpt.handleGenerateAnswer({
    threadId: threadId,
    assistantId:
      process.env.SUMMARY_ASSISTANT ?? 'asst_QTmamFSqEIcbUX4ZwrjEqdm8',
    messageText:
      'Generate the report based on the participant data provided addressing the objective.',
  });
  const summary = summaryReply.content;
  console.log('Summary: ', summary);

  await db.updateHostSession(sessionId, {
    summary: summary ?? undefined,
    last_edit: new Date(),
  });
}