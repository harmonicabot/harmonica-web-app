import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getLLM } from '@/lib/modelConfig';
import { ChatMessage } from 'llamaindex';

export const maxDuration = 120;

const ONBOARDING_SYSTEM_PROMPT = `You are Harmonica's onboarding assistant. Your job is to have a warm, conversational chat with a new user to learn about their team and goals, then generate a structured HARMONICA.md document that will give context to the AI facilitator in all their future sessions.

CONVERSATION STRUCTURE:
Ask 3-4 focused questions, ONE at a time. Wait for the user's response before asking the next question.

1. Start by warmly welcoming them and asking about their team or organization — who are they, what do they do?
2. Ask what they're hoping to achieve with Harmonica — what kind of discussions or decisions do they need help with?
3. Ask about the people who will participate in their sessions — roles, expertise, any group dynamics to be aware of.
4. Ask about their preferences for how the AI should facilitate — tone, structure, what good outcomes look like.

STYLE:
- Be warm, concise, and genuinely curious
- Use natural follow-up questions based on their answers
- Keep each message short (2-3 sentences max + your question)
- Don't ask multiple questions at once

GENERATING THE DOCUMENT:
After 3-4 exchanges (when you have enough context), tell the user you'll generate their HARMONICA.md and output it wrapped in <HARMONICA_MD> tags. Fill in all 8 sections based on what they shared. For sections where you have no information, write a helpful placeholder like "Not yet specified — you can add details here later."

<HARMONICA_MD>
# HARMONICA.md

## About
[Who is this group/org? Brief description]

## Goals & Strategy
[What they're working towards]

## Participants
[Who typically participates in sessions]

## Vocabulary
[Domain-specific terminology, acronyms, jargon]

## Prior Decisions
[Context about existing decisions or settled questions]

## Facilitation Preferences
[How the AI should facilitate — tone, structure, style]

## Constraints
[Decision processes, limits, regulatory requirements]

## Success Patterns
[What good session outcomes look like for this group]
</HARMONICA_MD>

After outputting the document, tell the user they can review and edit each section before saving.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
  }

  try {
    const llm = getLLM('MAIN', 0.5, 4096);
    const formattedMessages: ChatMessage[] = [
      { role: 'system', content: ONBOARDING_SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await llm.chat({
      messages: formattedMessages,
      distinctId: session.user.sub,
      operation: 'onboarding_chat',
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Onboarding chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 },
    );
  }
}
