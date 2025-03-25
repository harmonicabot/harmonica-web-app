'use server';
import { Message, UserSession } from '@/lib/schema';
import * as db from '@/lib/db';
import { extractDataWithLlama } from '@/lib/export/llamaExport';

export async function extractDataFromUserMessages(
  userData: UserSession[],
  exportInstructions: string,
) {
  const allUsersMessages = await db.getAllMessagesForUsersSorted(userData);
  const messagesByThread = allUsersMessages.reduce(
    (acc, message) => {
      acc[message.thread_id] = acc[message.thread_id] || [];
      acc[message.thread_id].push(message);
      return acc;
    },
    {} as Record<string, Message[]>,
  );
  const chatMessages = Object.entries(messagesByThread).map(
    ([threadId, messages]) => concatenateMessages(messages),
  );

  return await extractDataWithLlama(chatMessages, exportInstructions);
}

function concatenateMessages(messagesFromOneUser: Message[]) {
  messagesFromOneUser.sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime(),
  );
  return messagesFromOneUser
    .map((message) => `${message.role} : ${message.content}`)
    .join('\n');
}

type SimScoreIdeas = [{ author_id: string; idea: string }];

type SimScoreRequest = {
  ideas: SimScoreIdeas;
  advanced_features: {
    relationship_graph: boolean;
    pairwise_similarity_matrix: boolean;
  };
};

type SimScoreResponse = {
  ranked_ideas?: {
    id?: string;
    author_id?: string;
    idea: string;
    similarity_score: number;
  }[];
};

export async function analyzeWithSimScore(
  formattedData: string,
): Promise<string> {
  try {
    const asJson: SimScoreIdeas = JSON.parse(formattedData);

    const simscoreFormatted: SimScoreRequest = {
      ideas: asJson,
      advanced_features: {
        relationship_graph: false,
        pairwise_similarity_matrix: false,
      },
    };

    const url = process.env.SIMSCORE_API || 'https://api.simscore.xyz/v1';
    const response = await fetch(url + '/rank_ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SIMSCORE_API_KEY}`,
      },
      body: JSON.stringify(simscoreFormatted),
    });

    const rankedIdeas: SimScoreResponse = await response.json();

    return (
      rankedIdeas.ranked_ideas
        ?.map(
          (idea) =>
            `${idea.idea} \t\t(Similarity: ${(idea.similarity_score * 100).toFixed(2)}%)\n`,
        )
        .join('\n') || `No Results: ${rankedIdeas}`
    );
  } catch (error) {
    console.error('Error parsing JSON: ', error);
    console.log('Data:\n', formattedData);
    return 'Invalid JSON format. Please check your instructions.';
  }
}
