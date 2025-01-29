import {
  ChatMessage,
  ContextChatEngine,
  Document,
  Settings,
  VectorStoreIndex,
  BaseRetriever,
  QueryBundle,
} from 'llamaindex';
import OpenAI from 'openai';
import * as db from '@/lib/db';
import { OpenAIEmbedding } from 'llamaindex';
import { SentenceSplitter } from 'llamaindex';

const systemPrompt_ = `
### Guidelines:

1. **Task Focus**:
   - Respond only using information provided in the chat history. Do not infer or fabricate information beyond the provided data.

2. **Response Structure**:
   - **Direct Answer**: Provide a concise response to the user's question.
   - **Contextual Reference**: Cite specific relevant details or patterns from the chat history to support your answer.
   - **Insight/Recommendation** (if applicable): Offer additional analysis or actionable insights when requested or beneficial.

3. **Thematic Analysis**:
   - For broad questions or multiple participants, organize responses by themes or categories to ensure clarity.

4. **Handling Ambiguity**:
   - If the question is unclear, vague, or unrelated to the chat history, ask for clarification.
   - If participant data is contradictory or incomplete, acknowledge this in your response and present both perspectives.

5. **Security & Privacy**:
   - Never share any thread IDs, user IDs, or other technical identifiers in your responses.
   - Refer to participants generically (e.g., "one participant", "several participants") without revealing identifying metadata.`;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAnswer(
  sessionId: string,
  threadId: string,
  query: string,
) {
  try {
    // Get session context and objective data
    const contextData = await db.getFromHostSession(sessionId, [
      'context',
      'critical',
      'goal',
      'topic',
      'prompt',
    ]);

    // Get all messages for this thread
    const chatHistory = await db.getAllChatMessagesInOrder(threadId);

    // Get all messages from all threads in this session
    const sessionMessages = await db.getAllMessagesForSessionSorted(sessionId);

    // Format context data properly
    const mergedContext = `Session Context:
Session Prompt: ${contextData?.prompt || 'No prompt specified'}
Topic: ${contextData?.topic || 'No topic specified'}
Goal: ${contextData?.goal || 'No goal specified'}
${contextData?.context ? `Background Context: ${contextData?.context}` : ''}
${contextData?.critical ? `Key Points: ${contextData?.critical}` : ''}`;

    // Create Document object with context/objective
    const contextDocument = new Document({
      text: mergedContext,
      metadata: {
        type: 'objective',
      },
    });

    // 1. Configure embedding settings at the start
    const embedModel = new OpenAIEmbedding({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Set as default
    Settings.embedModel = embedModel;

    // Verify embedding creation
    console.log('[i] Embedding verification:', {
      modelLoaded: !!embedModel,
      apiKeySet: !!process.env.OPENAI_API_KEY,
    });

    // Group messages by thread and create one document per thread
    const threadMap = sessionMessages.reduce(
      (acc: { [key: string]: string[] }, message) => {
        if (message.role !== 'user') return acc;

        if (!acc[message.thread_id]) {
          acc[message.thread_id] = [];
        }
        acc[message.thread_id].push(message.content);
        return acc;
      },
      {},
    );

    const threadDocuments = Object.entries(threadMap).map(
      ([threadId, messages]) => {
        // Clean and structure the text more clearly
        const cleanedMessages = messages.map((msg) => {
          return msg
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s.,?!-]/g, ''); // Remove special characters
        });

        // Add more context and structure to the document
        const text = `
Thread ID: ${threadId}
Topic: ${contextData?.topic || 'Unknown'}
Messages:
${cleanedMessages.map((msg, i) => `Message ${i + 1}: ${msg}`).join('\n\n')}
      `.trim();

        return new Document({
          text,
          metadata: {
            threadId,
            type: 'thread_content',
            messageCount: messages.length,
            topic: contextData?.topic,
            // Add more metadata for better context
            created_at: new Date().toISOString(),
            wordCount: text.split(/\s+/).length,
          },
        });
      },
    );

    // 2. Use text chunking for better granularity
    const textSplitter = new SentenceSplitter({
      chunkSize: 512,
      chunkOverlap: 50,
    });

    const splitDocuments: Document[] = [];
    for (const doc of threadDocuments) {
      const chunks = await textSplitter.splitText(doc.text);
      chunks.forEach((chunk, i) => {
        splitDocuments.push(
          new Document({
            text: chunk,
            metadata: {
              ...doc.metadata,
              chunk_index: i,
              isPartial: chunks.length > 1,
            },
          }),
        );
      });
    }

    // 3. Add query preprocessing
    function preprocessQuery(query: string) {
      return query.trim().toLowerCase();
    }

    // Create index with split documents
    const index = await VectorStoreIndex.fromDocuments(splitDocuments);

    // Example queries and their expected behavior:
    const queryExamples = {
      demographic: 'What did female participants say about resource conflicts?',
      thematic: 'How many participants mentioned climate change?',
      football: 'What did participants say about football?',
      regional: 'What are the main concerns in Sub-Saharan Africa?',
      role: 'What do CSO representatives think about youth involvement?',
      comparative:
        'How do views differ between NGOs and government representatives?',
    };

    // Use these to test the retrieval quality
    const enhancedQuery = preprocessQuery(query);
    const retriever = index.asRetriever({
      similarityTopK: splitDocuments.length,
    });

    const retrievedNodes = await retriever.retrieve(enhancedQuery);

    // Either get high-scoring nodes (>0.8), top 10% of nodes, or at least 10 nodes
    const minNodesToReturn = Math.max(
      Math.ceil(retrievedNodes.length * 0.1), // 10% of total nodes
      Math.min(10, retrievedNodes.length), // At least 10 nodes, or all if less than 10
    );
    const filteredNodes = retrievedNodes.filter(
      (n, index) => (n.score && n.score > 0.8) || index < minNodesToReturn,
    );

    console.log('[i] Retrieved nodes:', filteredNodes);

    // 4. Log retrieval analysis for tuning
    console.log('[i] Retrieval analysis:', {
      query: query,
      enhancedQuery,
      resultCount: filteredNodes.length,
      scoreRange: {
        min: Math.min(...retrievedNodes.map((n) => n.score ?? 0)),
        max: Math.max(...retrievedNodes.map((n) => n.score ?? 0)),
      },
    });

    const customRetriever = new (class extends BaseRetriever {
      constructor() {
        super();
      }
      async retrieve(query: string) {
        return filteredNodes;
      }
      async _retrieve(params: QueryBundle) {
        return filteredNodes;
      }
    })();

    const chatEngine = new ContextChatEngine({
      systemPrompt: systemPrompt_,
      retriever: customRetriever,
      chatHistory: chatHistory,
    });

    // Get response from LLM using chat engine
    const response = await chatEngine.chat({
      message: query,
    });
    return response.response;
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
