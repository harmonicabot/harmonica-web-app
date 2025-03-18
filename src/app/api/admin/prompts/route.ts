import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows: prompts } = await sql`
      SELECT 
        p.id,
        p.prompt_type,
        p.instructions,
        p.active,
        p.created_at,
        p.updated_at,
        pt.id as type_id,
        pt.name as type_name,
        pt.description as type_description
      FROM prompts p
      JOIN prompt_type pt ON p.prompt_type = pt.id
      ORDER BY p.created_at DESC
    `;

    return NextResponse.json(
      prompts.map((prompt) => ({
        ...prompt,
        created_at: prompt.created_at?.toISOString(),
        updated_at: prompt.updated_at?.toISOString(),
      })),
    );
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt_type, instructions, active = true } = body;

    if (!prompt_type) {
      return NextResponse.json(
        { error: 'Prompt type is required' },
        { status: 400 },
      );
    }

    // Deactivate other prompts of the same type if this one will be active
    if (active) {
      await sql`
        UPDATE prompts 
        SET active = false 
        WHERE prompt_type = ${prompt_type} 
        AND active = true
      `;
    }

    // Create the new prompt
    const {
      rows: [result],
    } = await sql`
      INSERT INTO prompts (prompt_type, instructions, active)
      VALUES (${prompt_type}, ${instructions}, ${active})
      RETURNING id, prompt_type, instructions, active, created_at, updated_at
    `;

    const {
      rows: [completeResult],
    } = await sql`
      SELECT 
        p.id,
        p.prompt_type,
        p.instructions,
        p.active,
        p.created_at,
        p.updated_at,
        pt.id as type_id,
        pt.name as type_name,
        pt.description as type_description
      FROM prompts p
      JOIN prompt_type pt ON p.prompt_type = pt.id
      WHERE p.id = ${result.id}
    `;

    return NextResponse.json({
      ...completeResult,
      created_at: completeResult.created_at?.toISOString(),
      updated_at: completeResult.updated_at?.toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to create prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt', details: error.message },
      { status: 500 },
    );
  }
}
