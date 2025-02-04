import { NextResponse } from 'next/server';
import * as llamaIndexUtils from '../llamaIndexUtils';

export const runtime = 'edge'

export async function POST(req: Request) {
  const { messageText, threadId, sessionId } = await req.json();

  if (!messageText || !threadId || !sessionId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const answer = await llamaIndexUtils.generateAnswer(
      [
        sessionId,
        // 'hst_6e7cc76f5a98',
        // 'hst_59e1491a3beb',
        // 'hst_057e9678940c',
        // 'hst_db7dd9603754',
      ],
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
