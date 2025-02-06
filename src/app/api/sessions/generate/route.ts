import { generateSession } from '@/lib/sessionGenerator';
import { NextResponse } from 'next/server';

export const maxDuration = 200;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prompt,
      temperature,
      maxAnswers,
      sessionId,
      numSessions = 1,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      );
    }

    // Generate sessions
    const generatedSessions = [];
    for (let i = 0; i < numSessions; i++) {
      const threadId = await generateSession({
        sessionId,
        maxTurns: maxAnswers,
        temperature,
        responsePrompt: prompt,
      });
      generatedSessions.push(threadId);
    }

    return NextResponse.json({
      success: true,
      threadIds: generatedSessions,
    });
  } catch (error) {
    console.error('Session generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sessions' },
      { status: 500 },
    );
  }
}
