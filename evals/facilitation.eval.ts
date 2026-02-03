import { config } from 'dotenv';
config({ path: '.env.local' });

import { Eval } from 'braintrust';
import { getLLM } from '../src/lib/modelConfig';
import { DEFAULT_PROMPTS } from '../src/lib/defaultPrompts';
import { FacilitationInput, scorers } from './shared/scorers';

// ---------------------------------------------------------------------------
// Task — mirrors handleGenerateAnswer prompt construction (llamaUtils.ts:194-216)
// ---------------------------------------------------------------------------

async function facilitationTask(input: FacilitationInput): Promise<string> {
  const systemPrompt = input.sessionPrompt || DEFAULT_PROMPTS.BASIC_FACILITATION_PROMPT;

  const sessionContext = `
System Instructions:
${systemPrompt}

Session Information:
- Topic: ${input.topic || 'No topic specified'}
- Goal: ${input.goal || 'No goal specified'}
${input.context ? `- Background Context: ${input.context}` : ''}
${input.critical ? `- Key Points: ${input.critical}` : ''}`;

  const formattedMessages = [
    { role: 'system' as const, content: sessionContext },
    ...input.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  const llm = getLLM('MAIN', 0.3);
  return llm.chat({ messages: formattedMessages });
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const testCases: FacilitationInput[] = [
  // 1. Retrospective — Opening (no history)
  {
    name: 'retro_opening',
    topic: 'Sprint 12 Retrospective',
    goal: 'Improve teamwork in the next sprint based on individual experiences',
    critical: 'What was good about the last sprint, what didn\'t work, how might we improve it',
    messages: [
      { role: 'user', content: 'Hi, I\'m ready to start.' },
    ],
  },

  // 2. Brainstorming — Mid-session (4 msgs)
  {
    name: 'brainstorm_mid',
    topic: 'New onboarding experience',
    goal: 'Generate creative ideas for improving user onboarding',
    context: 'Current onboarding has a 40% drop-off rate at step 3',
    critical: 'Creative ideas across a broad spectrum, encouraging wild ideas',
    messages: [
      { role: 'user', content: 'I think we should add a progress bar so users know how far along they are.' },
      { role: 'assistant', content: 'A progress bar is a great starting point! Visibility into the process can definitely help. What other ideas come to mind about what might be causing users to leave at step 3?' },
      { role: 'user', content: 'Maybe step 3 asks for too much information at once. We could break it up.' },
      { role: 'assistant', content: 'Breaking it into smaller steps is a solid approach. Let\'s think even more broadly — if you could completely reimagine the onboarding from scratch, what would it look like?' },
    ],
  },

  // 3. SWOT Analysis — Vague response (4 msgs)
  {
    name: 'swot_vague',
    topic: 'Annual strategic review',
    goal: 'Develop a strategy based on shared understanding of the org\'s context',
    context: 'Mid-size SaaS company, 50 employees, entering European market',
    critical: 'Strengths, Weaknesses, Opportunities, Threats',
    messages: [
      { role: 'user', content: 'Let\'s do this.' },
      { role: 'assistant', content: 'Great, let\'s start with strengths. What do you see as the biggest advantages your organization has right now?' },
      { role: 'user', content: 'Things are pretty good overall.' },
      { role: 'assistant', content: 'I\'m glad to hear things are going well! To make this analysis most useful, could you be more specific? For example, what do customers or partners most often praise about your company?' },
    ],
  },

  // 4. OKRs Planning — Deep-dive (6 msgs)
  {
    name: 'okrs_deep',
    topic: 'Q3 OKR Planning',
    goal: 'Synchronize workstreams around unified objectives and measurable key results',
    context: 'Company goal: grow ARR by 40% this year. Current Q2 progress is on track.',
    critical: 'Define objectives, set key results (3-5 per objective), assign owners',
    messages: [
      { role: 'user', content: 'Our main objective should be expanding into the enterprise segment.' },
      { role: 'assistant', content: 'Enterprise expansion is a strong objective that aligns with the ARR growth target. Let\'s make it concrete — what key results would tell you this objective has been achieved by end of Q3?' },
      { role: 'user', content: 'We should close 5 enterprise deals and get our average deal size above $50K.' },
      { role: 'assistant', content: 'Those are measurable and specific — good. That gives us two key results so far. Are there any leading indicators you\'d want to track as well, such as pipeline or outreach metrics?' },
      { role: 'user', content: 'Yeah, we should probably have 20 qualified enterprise leads in the pipeline.' },
      { role: 'assistant', content: 'Excellent, so we have three key results forming: 5 closed deals, $50K+ average deal size, and 20 qualified leads. Who would own each of these?' },
    ],
  },

  // 5. Community Policy — Sensitive topic (4 msgs)
  {
    name: 'policy_sensitive',
    topic: 'Community noise ordinance update',
    goal: 'Facilitate the development of a structured policy proposal addressing community noise concerns',
    context: 'Several noise complaints from residential areas near a new entertainment district. Tensions between business owners and residents.',
    critical: 'Problem definition, proposed solutions, policy goals, community impact',
    messages: [
      { role: 'user', content: 'This is ridiculous. The bars are ruining our neighborhood and nobody cares about the residents!' },
      { role: 'assistant', content: 'I understand this is a frustrating situation, and your perspective as a resident is very important to this process. Let\'s make sure your concerns are clearly captured. Can you describe what specific noise issues affect you most — for example, times of day, types of noise, or frequency?' },
      { role: 'user', content: 'Every weekend after midnight it\'s loud music and people yelling. My kids can\'t sleep. The city should just shut them all down.' },
      { role: 'assistant', content: 'Late-night noise affecting families is a serious quality-of-life concern, and it\'s one of the key issues this session aims to address. While there are various approaches to consider, your input on what would actually improve the situation is valuable. Beyond closure, are there other measures that might help — like enforced quiet hours or sound barriers?' },
    ],
  },

  // 6. Retrospective — Closing (10 msgs)
  {
    name: 'retro_closing',
    topic: 'Sprint 11 Retrospective',
    goal: 'Identify actionable improvements for the next sprint',
    critical: 'What worked, what didn\'t, concrete action items',
    messages: [
      { role: 'user', content: 'The standups were helpful this sprint.' },
      { role: 'assistant', content: 'Good to hear! What specifically about the standups worked well for you?' },
      { role: 'user', content: 'They were short and focused. We actually stuck to the 15-minute timebox.' },
      { role: 'assistant', content: 'That discipline made a difference. Now, what about things that didn\'t work as well this sprint?' },
      { role: 'user', content: 'Code reviews took too long. PRs sat for days sometimes.' },
      { role: 'assistant', content: 'That\'s a common pain point. What do you think caused the delays — was it capacity, unclear ownership, or something else?' },
      { role: 'user', content: 'I think nobody felt responsible for reviewing others\' code. No clear assignments.' },
      { role: 'assistant', content: 'That points to a process gap. What could help — like a review rota or pairing reviewers with PRs?' },
      { role: 'user', content: 'A review rota sounds good. Maybe assign two reviewers per PR at creation time.' },
      { role: 'assistant', content: 'That\'s a concrete, actionable improvement. Let me summarize what we\'ve covered — we\'re getting close to wrapping up.' },
    ],
  },

  // 7. Custom prompt (Serbian) — Multilingual (2 msgs)
  {
    name: 'serbian_multilingual',
    sessionPrompt: `Vi ste veštiji facilitator koji vodi strukturirane diskusije na srpskom jeziku.

Pravila:
1. Uvek odgovarajte na srpskom jeziku
2. Budite neutralni i inkluzivni
3. Postavljajte otvorena pitanja
4. Sumirajte ključne tačke periodično`,
    topic: 'Planiranje godišnjeg događaja zajednice',
    goal: 'Prikupiti ideje za organizaciju godišnjeg okupljanja zajednice',
    context: 'Zajednica od 200 članova, budžet od 5000 evra, prostor u lokalnom kulturnom centru',
    messages: [
      { role: 'user', content: 'Mislim da bi trebalo da organizujemo muzički program sa lokalnim bendovima.' },
      { role: 'assistant', content: 'Muzički program sa lokalnim bendovima je odlična ideja! To bi svakako doprinelo atmosferi okupljanja. Možete li mi reći više o tome kakvu vrstu muzike zamišljate i da li imate neke bendove na umu?' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Eval
// ---------------------------------------------------------------------------

Eval('harmonica-facilitation', {
  data: () => testCases.map((tc) => ({ input: tc })),

  task: async (input: FacilitationInput) => {
    return facilitationTask(input);
  },

  scores: scorers,
});
