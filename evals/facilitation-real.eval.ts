import { config } from 'dotenv';
config({ path: '.env.local' });

import { Eval } from 'braintrust';
import { neon } from '@neondatabase/serverless';
import { FacilitationInput, scorers } from './shared/scorers';

// ---------------------------------------------------------------------------
// DB connection (raw SQL via @neondatabase/serverless — no Auth0/singleton deps)
// ---------------------------------------------------------------------------

const sql = neon(process.env.POSTGRES_URL!);

// ---------------------------------------------------------------------------
// Fetch qualifying threads from the last 14 days
// ---------------------------------------------------------------------------

interface ThreadRow {
  thread_id: string;
  topic: string;
  goal: string;
  context: string | null;
  critical: string | null;
  prompt: string;
}

interface MessageRow {
  role: 'user' | 'assistant';
  content: string;
}

interface RealEvalCase {
  input: FacilitationInput;
  expected: string; // the actual assistant response to judge
}

async function fetchRealSessions(): Promise<RealEvalCase[]> {
  // Find threads with enough conversation depth from recent sessions
  const threads = await sql`
    SELECT us.thread_id, hs.topic, hs.goal, hs.context, hs.critical, hs.prompt
    FROM user_db us
    JOIN host_db hs ON hs.id = us.session_id
    WHERE us.include_in_summary = true
      AND us.start_time > NOW() - INTERVAL '14 days'
      AND (SELECT COUNT(*) FROM messages_db m WHERE m.thread_id = us.thread_id) >= 6
    ORDER BY us.start_time DESC
    LIMIT 20
  ` as ThreadRow[];

  console.log(`[real-eval] Found ${threads.length} qualifying threads`);

  const cases: RealEvalCase[] = [];

  for (const thread of threads) {
    const messages = await sql`
      SELECT role, content
      FROM messages_db
      WHERE thread_id = ${thread.thread_id}
      ORDER BY created_at ASC
    ` as MessageRow[];

    // Find the last assistant message — that's the "output" to judge
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIdx = i;
        break;
      }
    }

    if (lastAssistantIdx < 1) continue; // need at least 1 prior message + the assistant response

    const history = messages.slice(0, lastAssistantIdx).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    cases.push({
      input: {
        name: `thread-${thread.thread_id.slice(0, 8)}`,
        sessionPrompt: thread.prompt,
        topic: thread.topic,
        goal: thread.goal,
        context: thread.context || undefined,
        critical: thread.critical || undefined,
        messages: history,
      },
      expected: messages[lastAssistantIdx].content,
    });
  }

  console.log(`[real-eval] Built ${cases.length} eval cases`);
  return cases;
}

// ---------------------------------------------------------------------------
// Eval
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);

// Cache fetched data so the task function can look up the expected output
let evalCases: RealEvalCase[] = [];

Eval('harmonica-facilitation', {
  experimentName: `real-sessions-${today}`,

  data: async () => {
    evalCases = await fetchRealSessions();
    return evalCases.map((c) => ({ input: c.input }));
  },

  // Identity task — returns the actual assistant response (no LLM generation)
  task: async (input: FacilitationInput) => {
    const found = evalCases.find((c) => c.input.name === input.name);
    if (!found) throw new Error(`No expected output for ${input.name}`);
    return found.expected;
  },

  scores: scorers,
});
