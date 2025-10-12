import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RequestData } from '@/lib/types';
import { ADJECTIVES, ANIMALS, COLORS } from './nameGeneratorData';
import { HostSession, UserSession } from './schema';
import { getNumUsersAndMessages } from './db';

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
    throw new Error(`Network error: ${error.message}`);
  });

  if (!response.ok) {
    console.error('Error from API:', response.status, response.statusText);
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // If we can't parse the error response, use the default message
    }
    
    throw new Error(errorMessage);
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

export function checkSummaryAndMessageTimes(
  hostData: HostSession,
  userData: UserSession[],
) {
  console.log('Checking for new messages...');
  const lastMessage = userData.reduce((latest, user) => {
    const messageTime = new Date(user.last_edit).getTime();
    return messageTime > latest ? messageTime : latest;
  }, 0);
  const lastSummaryUpdate = hostData.last_edit.getTime();
  const hasNewMessages = lastMessage > lastSummaryUpdate;
  console.log('Last message:', lastMessage);
  console.log('Last summary update:', lastSummaryUpdate);
  return { hasNewMessages, lastMessage, lastSummaryUpdate };
}

export function getUserStats(
  sessionToUserStats: Record<
    string,
    Record<string, { num_messages: number; finished: boolean, includedInSummary: boolean }>
  >,
  sessionId: string,
) {
  const userStats = sessionToUserStats[sessionId];
  const iterableStats = Object.entries(userStats);
  const usersWithMoreThan2MessagesNotIgnored = iterableStats.filter(
    ([_key, value]) => value.num_messages > 2 && value.includedInSummary,
  );
  const totalUsers = usersWithMoreThan2MessagesNotIgnored.length;
  const finishedUsers = usersWithMoreThan2MessagesNotIgnored.filter(
    ([_, value]) => value.finished,
  ).length;
  return { totalUsers, finishedUsers };
}

export function getUserNameFromContext(
  userContext?: Record<string, string>,
): string {
  if (!userContext) {
    return generateRandomName();
  }

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

  return generateRandomName();
}

function generateRandomName(): string {
  const randomElement = (arr: string[]) =>
    arr[Math.floor(Math.random() * arr.length)];

  const pattern = Math.floor(Math.random() * 3);

  switch (pattern) {
    case 0:
      return `${randomElement(ADJECTIVES)} ${randomElement(ANIMALS)}`;
    case 1:
      return `${randomElement(COLORS)} ${randomElement(ANIMALS)}`;
    case 2:
      return `${randomElement(COLORS)} ${randomElement(ADJECTIVES)} ${randomElement(ANIMALS)}`;
    default:
      return `${randomElement(ADJECTIVES)} ${randomElement(ANIMALS)}`;
  }
}

export enum SessionStatus {
  ACTIVE = 'Active',
  FINISHED = 'Finished',
  DRAFT = 'Draft'
}

export async function calculateStatus(session: HostSession): Promise<SessionStatus> {
  // We have a few different ways to calculate the status.
  // This is an attempt to unify it...
  // NOTE: This is NOT actually used though 😭 
  // Theoretically this would be the best way, but practically the code uses it slightly different 
  // (e.g. in batch, has other info already, ....)
  if (!session.active || session.final_report_sent) {
    return SessionStatus.FINISHED
  }

  // We can't rely on the session-intrinsic numbers unfortunately; they were never updated properly.
  // Instead, we need to get the number of users and messages from the database.
  const sessionToUserStats = await getNumUsersAndMessages([session.id]);
  const {totalUsers} = getUserStats(sessionToUserStats, session.id)

  if (totalUsers === 0) {
    return SessionStatus.DRAFT
  }

  return SessionStatus.ACTIVE  
}
