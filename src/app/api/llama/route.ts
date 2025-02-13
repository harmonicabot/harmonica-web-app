import { NextResponse } from 'next/server';
import { generateMonicaAnswer } from '@/lib/monica/monicaAnswer';

export const maxDuration = 300;

export async function POST(req: Request) {
  const { chatHistory, query, sessionIds } = await req.json();

  if (!chatHistory || !query || !sessionIds) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  try {
    const answer = await generateMonicaAnswer(
      sessionIds,
      chatHistory,
      query
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
