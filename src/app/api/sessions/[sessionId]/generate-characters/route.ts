import { generateCharacters } from '@/lib/characterGenerator';
import { NextRequest } from 'next/server';

export const maxDuration = 200;
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const characters = await generateCharacters(params.sessionId);

    return Response.json({ characters });
  } catch (error) {
    console.error('Failed to generate characters:', error);
    return Response.json(
      { error: 'Failed to generate characters' },
      { status: 500 },
    );
  }
}
