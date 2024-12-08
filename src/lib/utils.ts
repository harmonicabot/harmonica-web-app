import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RequestData } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const sendApiCall = async (request: RequestData) => {
  console.log('Sending API call:', request);
  const response = await fetch('/api/' + request.target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  }).catch((error) => {
    console.error('Error sending or receiving API call:', error);
    return error;
  });

  if (!response.ok) {
    console.error('Error from API:', response.status, response.statusText);
    return null;
  }

  if (request.stream) {
    console.log('Streaming response:', response.body);
    return response.body;
  } else {
    const responseText = await response.text();
    const result = JSON.parse(responseText);
    // console.log('API response:', result);
    return result;
  }
};

import * as db from './db';
import * as gpt from 'app/api/gptUtils';
import { Message, HostSession, UserSession } from './schema_updated';

// Define the type for the grouped chats
interface GroupedChats {
  [threadId: string]: Message[];
}

export async function createSummary(sessionId: string) {
  console.log(`Creating summary for ${sessionId}...`);
  const chats = await db.getAllMessagesForSessionSorted(sessionId);
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

export function checkSummaryAndMessageTimes(
  hostData: HostSession,
  userData: UserSession[],
) {
  console.log('Checking for new messages...');
  const lastMessage = userData.reduce((latest, user) => {
    const messageTime = new Date(user.last_edit).getTime();
    return messageTime > latest ? messageTime : latest;
  }, 0);
  console.log('Last message:', lastMessage);
  console.log('Last summary update:', hostData);
  const lastSummaryUpdate = hostData.last_edit.getTime();
  const hasNewMessages = lastMessage > lastSummaryUpdate;
  return { hasNewMessages, lastMessage, lastSummaryUpdate };
}

export function getUserStats(
  sessionToUserStats: Record<
    string,
    Record<string, { num_messages: number; finished: boolean }>
  >,
  sessionId: string,
) {
  const userStats = sessionToUserStats[sessionId];
  const iterableStats = Object.entries(userStats);
  const usersWithMoreThan2Messages = iterableStats.filter(
    ([_key, value]) => value.num_messages > 2,
  );
  const totalUsers = usersWithMoreThan2Messages.length;
  const finishedUsers = usersWithMoreThan2Messages.filter(
    ([_, value]) => value.finished,
  ).length;
  return { totalUsers, finishedUsers };
}

export function getUserNameFromContext(
  userContext?: Record<string, string>,
): string {
  if (!userContext) return 'Anonymous User';

  // Regex patterns for common username field variations
  const patterns = [
    /^name$/i,
    /^(user)?name$/i,
    /^(user|display)[\s_-]?name$/i,
    /^(first|given)[\s_-]?name$/i,
    /^(full|complete)[\s_-]?name$/i,
    /^(preferred|nick)[\s_-]?name$/i,
    /^(display|screen)[\s_-]?name$/i,
    /^handle$/i,
    /^alias$/i,
    /^identity$/i,
    /^(user)?id$/i,
  ];

  // Try primary patterns
  for (const [key, value] of Object.entries(userContext)) {
    if (patterns.some((pattern) => pattern.test(key)) && value) {
      const cleanedValue = value.trim();
      if (cleanedValue.length >= 2) return cleanedValue;
    }
  }

  // Fallbacks
  const nameKey = Object.keys(userContext).find(
    (key) => /name/i.test(key) && userContext[key]?.trim().length >= 2,
  );
  if (nameKey) return userContext[nameKey].trim();

  const emailKey = Object.keys(userContext).find(
    (key) => /^email$/i.test(key) || /email/i.test(key),
  );
  if (emailKey && userContext[emailKey]) {
    const emailParts = userContext[emailKey].split('@')[0];
    if (emailParts.length >= 2) {
      const cleanedEmail = emailParts
        .replace(/[0-9._-]+$/, '')
        .replace(/[._-]/g, ' ')
        .trim();
      if (cleanedEmail.length >= 2) {
        return cleanedEmail
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  }

  return `Anonymous${Math.floor(Math.random() * 9000 + 1000)}`;
}
