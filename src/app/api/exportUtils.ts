'use server';
import { Message, UserSession } from '@/lib/schema';
import {
  handleCreateThread,
  handleGenerateAnswer,
  sendMessage,
} from './gptUtils';
import * as db from '@/lib/db';
import {extractDataWithLlama} from '@/lib/export/llamaExport';

export async function extractDataFromUserMessages(
  userData: UserSession[],
  exportInstructions: string
) {
  const allUsersMessages = await db.getAllMessagesForUsersSorted(userData);
  const messagesByThread = allUsersMessages.reduce((acc, message) => {
    acc[message.thread_id] = acc[message.thread_id] || [];
    acc[message.thread_id].push(message);
    return acc;
  }, {} as Record<string, Message[]>);
  const chatMessages = Object.entries(messagesByThread).map(
    ([threadId, messages]) => concatenateMessages(messages)
  );

  return await extractDataWithLlama(chatMessages, exportInstructions);
}

/**
 * Original OpenAI-based implementation for extracting relevant data
 * This is kept for backward compatibility but new code should use
 * the LlamaIndex implementation in lib/export/llamaExport.ts
 * @deprecated Use extractDataWithLlama from lib/export/llamaExport.ts instead
 */
export async function extractRelevantDataWithAI(
  context: string[],
  exportInstructions: string
) {
  console.log(`Creating thread for OpenAI export...`);
  const threadId = await handleCreateThread({
    role: 'assistant',
    content:
      exportInstructions +
      '\n\nThe chat history for the export will follow:\n-----START USER CHATS-----\n',
  });

  for (const message of context) {
    await sendMessage(
      threadId,
      'assistant',
      '\n---- NEXT USER CHAT: ----\n' + message + '\n---- END USER CHAT ----\n'
    );
  }

  console.log(`Got threadID: ${threadId}; asking AI to format data...`);
  const answer = await handleGenerateAnswer({
    threadId: threadId,
    assistantId:
      process.env.EXPORT_ASSISTANT ?? 'asst_bat7RPhD81IFkNDU9VLuQnn4', // Dev assistant
    messageText: `Now export the data according to the initial instructions to JSON.`,
  });
  return answer.content;
}

function concatenateMessages(messagesFromOneUser: Message[]) {
  messagesFromOneUser.sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime()
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
  formattedData: string
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

    const url = process.env.SIMSCORE_API || 'https://api.simscore.xyz/v1'
    const response = await fetch(
      url + '/rank_ideas',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simscoreFormatted),
      }
    );

    const rankedIdeas: SimScoreResponse = await response.json()

    return rankedIdeas.ranked_ideas
      ?.map((idea) => `${idea.idea} \t\t(Similarity: ${(idea.similarity_score * 100).toFixed(2)}%)\n`)
      .join('\n') || `No Results: ${rankedIdeas}`
  } catch (error) {
    console.error('Error parsing JSON: ', error);
    console.log('Data:\n', formattedData);
    return 'Invalid JSON format. Please check your instructions.';
  }
}
