import { NextRequest, NextResponse } from 'next/server';
import { generateParticipantAnswer } from '@/lib/participantAnswerGenerator';

export async function POST(request: NextRequest) {
  try {
    const { threadId } = await request.json();

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400 },
      );
    }

    const response = await generateParticipantAnswer({ threadId });

    return NextResponse.json({
      content: response.content,
    });
  } catch (error) {
    console.error('Error generating participant suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate participant suggestion' },
      { status: 500 },
    );
  }
}
