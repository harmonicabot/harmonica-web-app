import * as db from '@/lib/db';
import * as llama from '../app/api/llamaUtils';
import { getUserNameFromContext } from '@/lib/clientUtils';
import { generateFormAnswers } from './formAnswerGenerator';
import { getLLM } from '@/lib/modelConfig';

interface SessionConfig {
  maxTurns: number;
  sessionId: string;
  temperature?: number;
  responsePrompt?: string;
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
  const llm = getLLM('MAIN', 0.1); // Low temperature for more consistent results

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
    const { temperature = 0.7, responsePrompt = DEFAULT_RESPONSE_PROMPT } =
      config;

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

    // Set up LLM with MAIN model configuration
    const llm = getLLM('MAIN', temperature);

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
      const questionResponse = await llama.handleGenerateAnswer({
        threadId,
        messageText: lastUserMessage,
        sessionId: config.sessionId,
        systemPrompt: userContextPrompt,
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

      // Generate response using LLM
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

async function createThreadWithContext(config: SessionConfig, context: string) {
  // Format user context as entry message
  const userContextPrompt = context
    ? `IMPORTANT USER INFORMATION:\n${context}`
    : '';

  const threadId = crypto.randomUUID();
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
