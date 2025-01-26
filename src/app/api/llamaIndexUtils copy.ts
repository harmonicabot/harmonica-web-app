import {
  ChatMessage,
  ContextChatEngine,
  Document,
  Settings,
  VectorStoreIndex,
} from 'llamaindex';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Update chunk size
Settings.chunkSize = 512;

export async function generateAnswer(
  // objectiveData: string,
  // chatHistory: ChatMessage[],
  // chatContext: string[],
  // systemPrompt: string,
  sessionId: string,
  threadId: string,
  query: string,
) {
  // Create Document object with essay
  // const document = new Document({
  //   text: objectiveData,
  //   metadata: {
  //     type: 'objective',
  //   },
  // });

  // // Create Document object with chat messages
  // const chatDocuments = chatContext.map(
  //   (message) =>
  //     new Document({
  //       text: message,
  //       metadata: {
  //         type: 'chat',
  //       },
  //     }),
  // );

  // // Split text and create embeddings. Store them in a VectorStoreIndex
  // const index = await VectorStoreIndex.fromDocuments([
  //   document,
  //   ...chatDocuments,
  // ]);

  // const retriever = index.asRetriever();

  // const chatEngine = new ContextChatEngine({
  //   retriever,
  //   systemPrompt: systemPrompt,
  //   chatHistory: chatHistory,
  // });

  // const result = await chatEngine.chat({ message: query });
  // console.log('[i] query result -> ', result);
  const message = 'Hi there from llama index';

  return message;
}
