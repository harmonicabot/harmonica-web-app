import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RequestData } from '@/lib/types';
import { ADJECTIVES, ANIMALS, COLORS } from './nameGeneratorData';
import { HostSession, UserSession } from './schema';

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
  console.log('Last summary update:', hostData.last_edit);
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
