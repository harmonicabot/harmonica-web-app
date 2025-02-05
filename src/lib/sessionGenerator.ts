import { OpenAI as LlamaOpenAI } from 'llamaindex';
import * as db from '@/lib/db';
import * as gpt from '../app/api/gptUtils';
import { getUserNameFromContext } from '@/lib/clientUtils';
import { generateFormAnswers } from './formAnswerGenerator';

enum ModelProvider {
  GPT4 = 'gpt-4o-mini',
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

    // Get session data from DB
    const sessionData = await db.getFromHostSession(config.sessionId, [
      'context',
      'critical',
      'goal',
      'topic',
      'prompt',
      'assistant_id',
      'questions',
    ]);

    console.log('[i] questions', sessionData?.questions);

    if (!sessionData) {
      throw new Error('Session data not found');
    }

    if (!sessionData.assistant_id) {
      throw new Error('No assistant ID found for session');
    }

    // Generate form answers if questions exist
    let userContextPrompt = '';
    if (sessionData.questions) {
      const questions =
        typeof sessionData.questions === 'string'
          ? JSON.parse(sessionData.questions)
          : sessionData.questions;

      userContextPrompt = await generateFormAnswers(
        questions,
        {
          topic: sessionData.topic || '',
          goal: sessionData.goal || '',
          context: sessionData.context || '',
          critical: sessionData.critical || '',
        },
        responsePrompt,
      );
    }

    console.log('[i] userContextPrompt', userContextPrompt);

    // Set up LlamaIndex chat model
    const llm = new LlamaOpenAI({
      model: modelProvider,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
      temperature: temperature,
    });

    const threadId = await createThreadWithContext(config, userContextPrompt);
    let turnCount = 0;
    let lastUserMessage = userContextPrompt;

    await db.insertChatMessage({
      thread_id: threadId,
      role: 'user',
      content: userContextPrompt,
      created_at: new Date(),
    });

    while (turnCount < config.maxTurns) {
      // Generate question using GPT utils with last user message
      const questionResponse = await gpt.handleGenerateAnswer({
        threadId,
        assistantId: sessionData.assistant_id,
        messageText: lastUserMessage,
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
            content: `${responsePrompt} Session context: ${userContextPrompt}

Additional response guidelines:
1. If multiple characters/personas are described, feel free to randomly choose one for variety
2. Show personality and emotion while staying consistent
3. Keep responses concise (2-3 sentences maximum)
4. Add character through:
   - Unique speech patterns or expressions
   - Emotional reactions
   - Personal opinions
   - Brief references to background
5. Use natural language with occasional filler words or expressions`,
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

async function createThreadWithContext(config: SessionConfig, context: string) {
  // Format user context as entry message
  const userContextPrompt = context
    ? `IMPORTANT USER INFORMATION:\n${context}`
    : '';

  // Create OpenAI thread with context as first message
  const threadId = await gpt.handleCreateThread(
    userContextPrompt
      ? { role: 'user', content: userContextPrompt }
      : undefined,
  );

  // Store session data
  const simulatedUserName =
    '[AI] ' +
    getUserNameFromContext(typeof context === 'string' ? { context } : context);

  await db.insertUserSessions({
    session_id: config.sessionId,
    user_id: simulatedUserName + '_' + crypto.randomUUID(),
    user_name: simulatedUserName,
    thread_id: threadId,
    active: true,
    start_time: new Date(),
    last_edit: new Date(),
  });

  return threadId;
}
