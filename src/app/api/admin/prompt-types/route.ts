import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows: promptTypes } = await sql`
      SELECT 
        id,
        name, 
        description, 
        created_at, 
        updated_at
      FROM prompt_type
      ORDER BY created_at DESC
    `;

    return NextResponse.json(
      promptTypes.map((type) => ({
        ...type,
        created_at: type.created_at?.toISOString(),
        updated_at: type.updated_at?.toISOString(),
      })),
    );
  } catch (error) {
    console.error('Failed to fetch prompt types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt types' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { name, description } = body;

    const {
      rows: [result],
    } = await sql`
      INSERT INTO prompt_type (name, description)
      VALUES (${name}, ${description})
      RETURNING name, description
    `;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt type', details: error.message },
      { status: 500 },
    );
  }
}
