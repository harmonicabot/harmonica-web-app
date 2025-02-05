import { OpenAI as LlamaOpenAI } from 'llamaindex';
import * as db from '@/lib/db';

export async function generateCharacters(sessionId: string): Promise<string> {
  // Get session context
  const sessionData = await db.getFromHostSession(sessionId, [
    'context',
    'goal',
    'topic',
    'critical',
  ]);

  if (!sessionData) {
    throw new Error('Session data not found');
  }

  // Set up LlamaIndex chat model
  const llm = new LlamaOpenAI({
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1500,
    temperature: 0.8,
  });

  const prompt = `Given this workshop context:
Topic: ${sessionData.topic}
Goal: ${sessionData.goal}
Context: ${sessionData.context}
Key Question: ${sessionData.critical}

Generate 5 diverse personas who might participate in this workshop. Each character should:
1. Have backgrounds and experiences that could contribute to the discussion
2. Represent different viewpoints and approaches to the topic
3. Have distinct personalities that would create interesting dynamics
4. Be realistic and relatable
5. Have plausible reasons for participating in this workshop

Format each character as:
Character: [Name]
Age: [Age]
Background: [Relevant background/experience]
Personality: [Key personality traits]
Interests: [Relevant interests and focus areas]

---

Create authentic characters with diverse perspectives while avoiding assumptions about their roles or status.`;

  const response = await llm.chat({
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message.content?.toString() || '';
}
