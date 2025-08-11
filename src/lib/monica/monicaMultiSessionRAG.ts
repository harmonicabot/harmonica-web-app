import {
  ContextChatEngine,
  Document,
  Settings,
  VectorStoreIndex,
  BaseRetriever,
  QueryBundle,
} from 'llamaindex';
import { GEMINI_MODEL, Gemini } from '@llamaindex/google';

import * as db from '@/lib/db';
import { OpenAIEmbedding } from 'llamaindex';
import { SentenceSplitter } from 'llamaindex';
import { OpenAI as LlamaOpenAI } from 'llamaindex';

const initialPrompt = `
### Guidelines:

1. **Task Focus**:
   - For analytical questions (patterns, frequencies, summaries):
     * Analyze ALL provided messages and conversations
     * Count occurrences and identify patterns
     * Provide quantitative insights when possible
     * Synthesize information across all available data
   - For specific questions:
     * Focus on relevant details from specific conversations

2. **Response Structure**:
   - **Direct Answer**: Provide a concise response to the user's question
   - **Contextual Reference**: Cite specific relevant details or patterns from the chat history
   - **Insight/Recommendation** (if applicable): Offer additional analysis or actionable insights

3. **Handling Frequencies and Patterns**:
   - When asked about "most common" or patterns:
     * Review all messages
     * Count occurrences
     * Identify recurring themes
     * Provide specific examples

4. **Security & Privacy** (CRITICAL):
   - NEVER include any identifiers in responses
   - Use generic terms like "a participant" or "several participants"
   - Remove or redact any identifiers from examples`;

export async function generateAnswer(
  sessionIds: string[],
  threadId: string,
  query: string,
) {
  try {
    // Get session context and objective data for all sessions
    const sessionsData = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const data = await db.getFromHostSession(sessionId, [
          'context',
          'critical',
          'goal',
          'topic',
          'prompt',
        ]);
        return { sessionId, ...data };
      }),
    );

    // Get all messages for this thread
    const chatHistory = await db.getAllChatMessagesInOrder(threadId);

    // Get all messages from all sessions
    const sessionMessages = await Promise.all(
      sessionIds.map(
        async (sessionId) => await db.getAllMessagesForSessionSorted(sessionId),
      ),
    ).then((messages) => messages.flat());

    // Format context data properly for all sessions
    const mergedContext = sessionsData
      .map(
        (contextData) => `
Session Context:
Session ID: ${contextData.sessionId}
Session Prompt: ${contextData?.prompt || 'No prompt specified'}
Topic: ${contextData?.topic || 'No topic specified'}
Goal: ${contextData?.goal || 'No goal specified'}
${contextData?.context ? `Background Context: ${contextData?.context}` : ''}
${contextData?.critical ? `Key Points: ${contextData?.critical}` : ''}`,
      )
      .join('\n\n');

    // Create Document object with context/objective
    const contextDocument = new Document({
      text: mergedContext,
      metadata: {
        type: 'objective',
        sessionIds: sessionIds,
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
      (
        acc: { [key: string]: { messages: string[]; sessionId: string } },
        message,
        _,
        __,
        currentSessionId = sessionIds[0],
      ) => {
        if (message.role !== 'user') return acc;

        if (!acc[message.thread_id]) {
          acc[message.thread_id] = {
            messages: [],
            sessionId: currentSessionId,
          };
        }
        acc[message.thread_id].messages.push(message.content);
        return acc;
      },
      {},
    );

    const threadDocuments = Object.entries(threadMap).map(
      ([threadId, { messages, sessionId }]) => {
        const sessionData = sessionsData.find((s) => s.sessionId === sessionId);
        const cleanedMessages = messages.map((msg) => {
          return msg
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,?!-]/g, '');
        });

        // Format messages to be more analysis-friendly
        const text = `
Thread ID: ${threadId}
Session ID: ${sessionId}
Topic: ${sessionData?.topic || 'Unknown'}
Response Summary:
${cleanedMessages.map((msg) => `- ${msg}`).join('\n')}
Total Responses: ${messages.length}
        `.trim();

        return new Document({
          text,
          metadata: {
            threadId,
            sessionId,
            type: 'thread_content',
            messageCount: messages.length,
            topic: sessionData?.topic,
            created_at: new Date().toISOString(),
            // Remove responses from metadata to reduce size
            responseCount: cleanedMessages.length,
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

    // Determine query type using LlamaIndex chat model
    const classificationModel = new LlamaOpenAI({
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
    });

    const classificationPrompt = `Analyze this question: "${query}"

    Think through this step by step:
    1. Consider if the question:
       - Requires counting frequencies or finding "most common" patterns (analytical)
       - Needs statistical analysis across messages (analytical)
       - Looks for topic-specific content or mentions (specific)
       - Asks about specific details or events (specific)
       - Searches for particular themes or keywords (specific)
    
    2. Examples:
       - "What was the most common response?" -> analytical (needs to count ALL responses)
       - "What did participant #123 say in thread ABC?" -> specific (single participant, specific thread)
       - "What are people saying about X?" -> specific (find messages about X)
       - "How many times was X mentioned?" -> analytical (needs to count across messages)
       - "What do most people think?" -> analytical (needs majority analysis)
    
    3. IMPORTANT: Return ONLY a raw JSON object without any markdown, quotes, or code blocks.
    Example of correct format:
    {"type":"analytical","confidence":0.9}
    
    Analyze the question and respond with ONLY the JSON object:`;

    const classificationResponse = await classificationModel.complete({
      prompt: classificationPrompt,
    });

    console.log('[i] Classification response:', classificationResponse);
    let queryClassification;
    try {
      queryClassification = JSON.parse(classificationResponse.text as string);
    } catch (error) {
      console.error('[x] Failed to parse classification response:', error);
      queryClassification = { type: 'analytical', confidence: 0.9 };
    }

    console.log('[i] Query type response:', queryClassification);

    const isAnalyticalQuery = queryClassification.type === 'analytical';

    // ------------------------

    //     if (isAnalyticalQuery) {
    //       const analyticalRetriever = new (class extends BaseRetriever {
    //         constructor() {
    //           super();
    //         }
    //         async retrieve() {
    //           // Get all messages from all threads
    //           const allResponses = threadDocuments
    //             .flatMap((doc) =>
    //               doc.text
    //                 .split('\n')
    //                 .filter((line) => line.trim().startsWith('- '))
    //                 .map((line) => line.replace('- ', '').trim()),
    //             )
    //             .filter(Boolean);

    //           // Count response frequencies
    //           const responseCounts = allResponses.reduce(
    //             (acc: { [key: string]: number }, response) => {
    //               acc[response] = (acc[response] || 0) + 1;
    //               return acc;
    //             },
    //             {},
    //           );

    //           const summaryDoc = new Document({
    //             text: `HERE ARE THE ACTUAL RESPONSE FREQUENCIES:
    // Total Responses Analyzed: ${allResponses.length}
    // Unique Responses Found: ${Object.keys(responseCounts).length}

    // FREQUENCY COUNT:
    // ${Object.entries(responseCounts)
    //   .sort(([, a], [, b]) => b - a)
    //   .map(([response, count]) => `"${response}": ${count} times`)
    //   .join('\n')}`,
    //             metadata: {
    //               type: 'analysis_summary',
    //               responseCount: allResponses.length,
    //               uniqueResponses: Object.keys(responseCounts).length,
    //             },
    //           });

    //           return [{ node: summaryDoc, score: 1 }];
    //         }
    //         async _retrieve(params: QueryBundle) {
    //           return this.retrieve();
    //         }
    //       })();

    //       const analyticalChatEngine = new ContextChatEngine({
    //         chatModel: new LlamaOpenAI({
    //           model: 'gpt-4-turbo-preview',
    //           apiKey: process.env.OPENAI_API_KEY,
    //           maxTokens: 1000,
    //           temperature: 0.3,
    //         }),
    //         retriever: analyticalRetriever,
    //         systemPrompt: `You are an analysis tool. The text above contains ACTUAL response frequencies.
    // When asked about frequencies or patterns, report the exact numbers you see.
    // Do not make up data or say you cannot access it.
    // The frequency count is right in front of you - just read and report it.`,
    //         chatHistory: chatHistory,
    //       });

    //       const response = await analyticalChatEngine.chat({
    //         message: `Above is a frequency count of actual responses.

    // Question: ${query}

    // Instructions:
    // 1. Look at the FREQUENCY COUNT section above
    // 2. Report the exact numbers you see
    // 3. For "most common" questions, list the top responses with their counts
    // 4. Do not say you cannot access the data - it's right there in the FREQUENCY COUNT

    // Example response format:
    // "Based on the frequency count provided:
    // - Most common response was X with N occurrences
    // - Second most common was Y with M occurrences
    // etc."`,
    //       });
    //       return response.response;
    //     } else {
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

    // Combine all relevant context into a single string
    const contextString = filteredNodes.map((node) => node.node).join('\n\n');

    const chatEngine = new Gemini({
      model: GEMINI_MODEL.GEMINI_PRO_LATEST,
      temperature: 0.3,
    });

    // Construct the full prompt with context
    const response = await chatEngine.chat({
      messages: [
        { role: 'system', content: initialPrompt },
        {
          role: 'user',
          content: `
### User Transcripts: 
${threadDocuments.map((doc) => doc.text).join('\n')}

### Question: ${query}

Please analyze the above context to answer the question.`,
        },
        ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
      ],
    });

    console.log('[i] Chat engine response:', response);
    return response.message.content;
    // }
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
