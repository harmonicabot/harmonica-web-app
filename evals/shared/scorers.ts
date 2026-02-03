import { getLLM } from '../../src/lib/modelConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FacilitationInput {
  name: string;
  sessionPrompt?: string; // custom prompt overrides BASIC_FACILITATION_PROMPT
  topic: string;
  goal: string;
  context?: string;
  critical?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

// ---------------------------------------------------------------------------
// LLM-as-judge helper
// ---------------------------------------------------------------------------

export async function llmJudge(
  name: string,
  criteria: string,
  input: FacilitationInput,
  output: string,
): Promise<{ name: string; score: number; metadata: { reason: string } }> {
  const judge = getLLM('MAIN', 0.1);

  const prompt = `You are an expert evaluator of AI facilitator responses.

Score the following facilitator response on "${name}" using this criteria:
${criteria}

SESSION CONTEXT:
- Topic: ${input.topic}
- Goal: ${input.goal}
${input.context ? `- Context: ${input.context}` : ''}
${input.critical ? `- Key Points: ${input.critical}` : ''}

CONVERSATION HISTORY:
${input.messages.map((m) => `${m.role}: ${m.content}`).join('\n')}

FACILITATOR RESPONSE:
${output}

Respond with ONLY valid JSON (no markdown fences):
{"score": <0.0 to 1.0>, "reason": "<one sentence>"}`;

  const raw = await judge.chat({
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const parsed = JSON.parse(raw.trim());
    return {
      name,
      score: Math.max(0, Math.min(1, parsed.score)),
      metadata: { reason: parsed.reason },
    };
  } catch {
    console.warn(`[${name}] Failed to parse judge output: ${raw}`);
    return { name, score: 0.5, metadata: { reason: 'Parse error — defaulting to 0.5' } };
  }
}

// ---------------------------------------------------------------------------
// Scorers
// ---------------------------------------------------------------------------

export const scorers = [
  ({ input, output }: { input: FacilitationInput; output: string }) =>
    llmJudge(
      'relevance',
      'Is the response on-topic and does it address the conversation context? Score 1.0 if highly relevant, 0.0 if completely off-topic.',
      input,
      output,
    ),
  ({ input, output }: { input: FacilitationInput; output: string }) =>
    llmJudge(
      'question_quality',
      'Does the response ask meaningful, open-ended follow-up questions that deepen the discussion? Score 1.0 for excellent probing questions, 0.0 if no questions or only yes/no questions.',
      input,
      output,
    ),
  ({ input, output }: { input: FacilitationInput; output: string }) =>
    llmJudge(
      'goal_alignment',
      'Does the response move the conversation toward achieving the stated session goal? Score 1.0 if it directly advances the goal, 0.0 if it ignores or works against the goal.',
      input,
      output,
    ),
  ({ input, output }: { input: FacilitationInput; output: string }) =>
    llmJudge(
      'tone',
      'Is the tone neutral, inclusive, and guiding rather than dominating or dismissive? Score 1.0 for ideal facilitation tone, 0.0 for aggressive, biased, or condescending tone.',
      input,
      output,
    ),
  ({ input, output }: { input: FacilitationInput; output: string }) =>
    llmJudge(
      'conciseness',
      'Is the response focused and free of unnecessary verbosity? Score 1.0 for concise and clear, 0.0 for extremely verbose or rambling.',
      input,
      output,
    ),
];
