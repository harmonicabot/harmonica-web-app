import { getLLM } from '@/lib/modelConfig';
import * as db from '@/lib/db';
import { getSessionOwner } from '@/lib/db';

export async function generateCharacters(sessionId: string): Promise<string> {
  // Get session context
  const sessionData = await db.getFromHostSession(sessionId, [
    'context',
    'goal',
    'topic',
    'critical',
    'questions',
  ]);

  if (!sessionData) {
    throw new Error('Session data not found');
  }

  // Get session owner (host) for analytics
  const hostId = await getSessionOwner(sessionId);

  // Set up LLM with SMALL model configuration
  const llm = getLLM('SMALL', 0.8);

  const prompt = `Given this workshop context:
Topic: ${sessionData.topic}
Goal: ${sessionData.goal}
Context: ${sessionData.context}
Key Question: ${sessionData.critical}
Questions at the beginning of the session: ${sessionData.questions}

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
    tag: 'character_generation',
    sessionIds: [sessionId],
    hostIds: hostId ? [hostId] : undefined,
  });

  return response || '';
}
