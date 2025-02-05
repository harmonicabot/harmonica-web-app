import { NextResponse } from 'next/server';
import * as llamaIndexUtils from '../llamaIndexUtils';

export async function POST(req: Request) {
  const { messageText, threadId, sessionIds } = await req.json();

  if (!messageText || !threadId || !sessionIds) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const answer = await llamaIndexUtils.generateAnswer(
      sessionIds,
      threadId,
      messageText,
    );

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error generating answer:', error);
    return NextResponse.json(
      { error: 'Failed to generate answer' },
      { status: 500 },
    );
  }
}
