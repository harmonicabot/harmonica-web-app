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

async function isSessionComplete(
  lastQuestion: string,
  sessionData: any,
): Promise<boolean> {
  const llm = new LlamaOpenAI({
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: 100,
    temperature: 0.1, // Low temperature for more consistent results
  });

  const prompt = `Given this workshop context:
Topic: ${sessionData.topic}
Goal: ${sessionData.goal}

And this last generated question: "${lastQuestion}"

Determine if this appears to be a concluding question that would end the session. Consider:
1. Does it ask for final thoughts or reflections?
2. Does it summarize or wrap up the discussion?
3. Does it contain closing language or farewell phrases?
4. Does it request feedback about the session?

Reply with ONLY "true" if the session should end, or "false" if it should continue.`;

  const response = await llm.chat({
    messages: [{ role: 'user', content: prompt }],
  });

  return (
    response.message.content?.toString().toLowerCase().includes('true') || false
  );
}

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

      // Store AI question
      await db.insertChatMessage({
        thread_id: threadId,
        role: 'assistant',
        content: questionResponse.content,
        created_at: new Date(),
      });

      // Add new session completion check
      const shouldEndSession = await isSessionComplete(
        questionResponse.content,
        sessionData,
      );

      if (shouldEndSession) {
        break;
      }

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
5. Use natural language with occasional filler words or expressions
6. IMPORTANT: Do not use or make up specific names - always refer to people by their roles or relationships instead
   - Even if names are provided in the context, replace them with roles (e.g., "I" or "my colleague" instead of "Clara")
   - Never create new names or pseudonyms
   - Use professional roles, relationships, or first-person perspective instead
7. Include a mix of response types:
   - Sometimes disagree or express skepticism
   - Occasionally share negative experiences or concerns
   - Don't always be agreeable - include constructive criticism
   - Feel free to challenge assumptions when appropriate
8. Show realistic human behaviors:
   - Sometimes give lazy or minimal effort responses
   - Occasionally admit to not knowing or not caring about certain topics
   - Don't always provide politically correct or socially desirable answers
   - Be willing to express unpopular or contrarian viewpoints
   - Show realistic imperfections like being tired, distracted, or unmotivated`,
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
