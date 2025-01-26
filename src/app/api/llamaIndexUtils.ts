import {
  ChatMessage,
  ContextChatEngine,
  Document,
  Settings,
  VectorStoreIndex,
} from 'llamaindex';
import OpenAI from 'openai';
import * as db from '@/lib/db';

const systemPrompt_ = `The next message will contain the chat history of participants in a session on a specific topic.

Your task is to answer user questions based exclusively on this chat history. 

---

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
   - If participant data is contradictory or incomplete, acknowledge this in your response and present both perspective`;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Update chunk size
// Settings.chunkSize = 512;

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

    // console.log('[i] Session objective:', {
    //   topic: contextData?.topic,
    //   goal: contextData?.goal,
    //   context: contextData?.context,
    //   critical: contextData?.critical,
    // });

    // Get all messages for this thread
    const chatHistory = await db.getAllChatMessagesInOrder(threadId);
    // console.log(
    //   '[i] Current thread history:',
    //   chatHistory.map((msg) => ({
    //     role: msg.role,
    //     content: msg.content,
    //     created_at: msg.created_at,
    //   })),
    // );

    // Get all messages from all threads in this session
    const sessionMessages = await db.getAllMessagesForSessionSorted(sessionId);
    // console.log(
    //   '[i] All session messages:',
    //   sessionMessages.map((msg) => ({
    //     thread_id: msg.thread_id,
    //     role: msg.role,
    //     content: msg.content,
    //     created_at: msg.created_at,
    //   })),
    // );

    // console.log('[i] Session prompt:', contextData?.prompt);

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

    // Group messages by thread and create a document per thread
    const threadDocuments = sessionMessages.reduce(
      (acc: Document[], message) => {
        // Skip if we already have a document for this thread
        if (acc.some((doc) => doc.metadata?.threadId === message.thread_id)) {
          return acc;
        }

        // Get all messages for this thread
        const threadMessages = sessionMessages
          .filter((msg) => msg.thread_id === message.thread_id)
          .map(
            (msg) =>
              `${msg.role === 'user' ? 'Participant' : 'Assistant'}: ${msg.content}`,
          )
          .join('\n\n');

        if (threadMessages.trim()) {
          acc.push(
            new Document({
              text: `Conversation Thread:\n\n${threadMessages}`,
              metadata: {
                type: 'chat',
                threadId: message.thread_id,
              },
            }),
          );
        }

        return acc;
      },
      [],
    );

    // console.log('[i] Thread documents:', threadDocuments);

    // Split text and create embeddings. Store them in a VectorStoreIndex
    const index = await VectorStoreIndex.fromDocuments([
      contextDocument,
      ...threadDocuments,
    ]);

    // Determine query type using OpenAI function calling
    const queryTypeResponse = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Analyze this question: "${query}"`,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'classifyQueryType',
            description: 'Classify the type of query being asked',
            parameters: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['analytical', 'specific'],
                  description: 'The type of query being asked',
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score between 0 and 1',
                },
              },
              required: ['type', 'confidence'],
            },
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'classifyQueryType' },
      },
    });

    console.log(
      '[i] Query type response:',
      queryTypeResponse.choices[0].message.tool_calls?.[0].function.arguments,
    );

    const queryClassification = JSON.parse(
      queryTypeResponse.choices[0].message.tool_calls?.[0].function.arguments ||
        '{}',
    );

    console.log('[i] Query type response:', queryClassification);

    const isAnalyticalQuery =
      queryClassification.type === 'analytical' &&
      queryClassification.confidence > 0.8;

    console.log('[i] isAnalyticalQuery:', isAnalyticalQuery);

    const retriever = index.asRetriever({
      similarityTopK: isAnalyticalQuery ? threadDocuments.length : 3,
    });

    const systemPrompt = `${systemPrompt_}
${
  isAnalyticalQuery
    ? `For this analytical query:
1. Analyze all provided threads to identify key themes and patterns
2. Group insights by topic or importance
3. Support observations with specific examples
4. Consider the session's context and objectives
5. Highlight areas of consensus and notable discussions`
    : `For this specific query:
1. Focus on the most relevant context
2. Provide a clear, direct response
3. Reference specific messages when helpful
4. Acknowledge any context limitations`
}`;

    const chatEngine = new ContextChatEngine({
      retriever,
      systemPrompt: systemPrompt_,
      chatHistory: chatHistory,
    });

    // Add debugging to see what's being retrieved
    const retrievedNodes = await retriever.retrieve(query);
    console.log(
      '[i] Retrieved nodes:',
      retrievedNodes.length > 3 ? retrievedNodes.length : retrievedNodes,
    );

    const result = await chatEngine.chat({ message: query });
    // console.log('[i] LlamaIndex response:', result.response);

    if (!result.response) {
      throw new Error('No response generated');
    }

    return result.response; // Return the actual response text
  } catch (error) {
    console.error('[x] LlamaIndex error:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
