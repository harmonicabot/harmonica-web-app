import { OpenAI as LlamaOpenAI } from 'llamaindex';
import * as db from '@/lib/db';
import * as gpt from '../app/api/gptUtils';
import { getUserNameFromContext } from '@/lib/clientUtils';

enum ModelProvider {
  GPT4 = 'gpt-4-turbo-preview',
  GPT3 = 'gpt-3.5-turbo',
  CLAUDE = 'claude-3-sonnet',
}

interface SessionConfig {
  maxTurns: number;
  sessionId: string;
  temperature?: number;
  responsePrompt?: string;
  modelProvider?: ModelProvider;
}

const DEFAULT_RESPONSE_PROMPT = `You are simulating user responses. Follow these guidelines:
1. Stay in character based on the provided context
2. Be consistent with previous responses
3. Use natural, conversational language
4. Maintain the perspective and knowledge level indicated in the context`;

export async function generateSession(config: SessionConfig) {
  try {
    const {
      temperature = 0.7,
      responsePrompt = DEFAULT_RESPONSE_PROMPT,
      modelProvider = ModelProvider.GPT4,
    } = config;

    console.log('[i] Generating session with config:', config.sessionId);
    // Get session data from DB
    const sessionData = await db.getFromHostSession(config.sessionId, [
      'context',
      'critical',
      'goal',
      'topic',
      'prompt',
      'assistant_id',
    ]);

    if (!sessionData) {
      throw new Error('Session data not found');
    }

    if (!sessionData.assistant_id) {
      throw new Error('No assistant ID found for session');
    }

    // Format context from session data
    const sessionContext: Record<string, string> = Object.entries({
      topic: sessionData.topic,
      goal: sessionData.goal,
      context: sessionData.context,
      critical: sessionData.critical,
      prompt: sessionData.prompt,
    }).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Set up LlamaIndex chat model
    const llm = new LlamaOpenAI({
      model: modelProvider,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
      temperature: temperature,
    });

    const threadId = await createThreadWithContext(config, sessionContext);
    let turnCount = 0;
    let lastUserMessage = '';

    while (turnCount < config.maxTurns) {
      // Generate question using GPT utils with last user message
      const questionResponse = await gpt.handleGenerateAnswer({
        threadId,
        assistantId: sessionData.assistant_id,
        messageText: lastUserMessage
          ? `Previous response: "${lastUserMessage}". Generate the next question for turn ${turnCount + 1}. Include ending signal if appropriate.`
          : `Generate the next question for turn ${turnCount + 1}. Include ending signal if appropriate.`,
      });

      if (isConversationComplete(questionResponse.content)) {
        break;
      }

      // Store AI question
      await db.insertChatMessage({
        thread_id: threadId,
        role: 'assistant',
        content: questionResponse.content,
        created_at: new Date(),
      });

      // Generate response using LlamaIndex OpenAI
      const userResponse = await llm.chat({
        messages: [
          {
            role: 'system',
            content: `${responsePrompt} Session context: ${JSON.stringify(sessionContext)}`,
          },
          {
            role: 'user',
            content: `Question: "${questionResponse.content}". Generate realistic response for turn ${turnCount + 1}.`,
          },
        ],
      });

      lastUserMessage = userResponse.message.content?.toString() || '';

      // Store user response
      await db.insertChatMessage({
        thread_id: threadId,
        role: 'user',
        content: lastUserMessage,
        created_at: new Date(),
      });

      turnCount++;
    }

    await db.updateUserSession(config.sessionId, {
      last_edit: new Date(),
      active: false,
    });

    return threadId;
  } catch (error) {
    console.error('[x] Session generation error:', error);
    throw error;
  }
}

function isConversationComplete(message: string): boolean {
  const endSignals = [
    'Thank you for completing',
    'conversation is complete',
    'session is finished',
    'we have concluded',
  ];

  return endSignals.some((signal) =>
    message.toLowerCase().includes(signal.toLowerCase()),
  );
}

async function generateUserResponse(
  client: LlamaOpenAI,
  params: {
    threadId: string;
    question: string;
    context?: Record<string, string>;
    turnCount: number;
  },
): Promise<string> {
  const prompt = `Given this context: ${JSON.stringify(params.context)}
    And this question: "${params.question}"
    Generate a realistic user response for turn ${params.turnCount + 1}.`;

  const response = await client.chat({
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message.content?.toString() || ''; // Convert to string
}

async function createThreadWithContext(
  config: SessionConfig,
  context: Record<string, string>,
) {
  // Format user context as entry message
  const userContextPrompt = context
    ? `IMPORTANT USER INFORMATION:\n${Object.entries(context)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')}`
    : '';

  const threadEntryMessage = userContextPrompt
    ? { role: 'user' as const, content: userContextPrompt }
    : undefined;

  // Create OpenAI thread
  const threadId = await gpt.handleCreateThread(threadEntryMessage);

  // Store session data
  const simulatedUserName = '[AI] ' + getUserNameFromContext(context);

  await db.insertUserSessions({
    session_id: config.sessionId,
    user_id: simulatedUserName + '_' + crypto.randomUUID(),
    user_name: simulatedUserName,
    thread_id: threadId,
    active: true,
    start_time: new Date(),
    last_edit: new Date(),
  });

  // Store initial context message
  if (userContextPrompt) {
    await db.insertChatMessage({
      thread_id: threadId,
      role: 'user',
      content: `User shared the following context:\n${Object.entries(
        context || {},
      )
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ')}`,
      created_at: new Date(),
    });
  }

  // Add ready-to-start message
  await db.insertChatMessage({
    thread_id: threadId,
    role: 'user',
    content: `${simulatedUserName} is ready to start the conversation.`,
    created_at: new Date(),
  });

  return threadId;
}
