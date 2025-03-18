import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const {
      rows: [prompt],
    } = await sql`
      SELECT 
        p.id,
        p.prompt_type,
        p.description,
        p.active,
        p.created_at,
        p.updated_at,
        pt.name as type_name,
        pt.description as type_description
      FROM prompts p
      JOIN prompt_type pt ON p.prompt_type = pt.id
      WHERE p.id = ${params.id}
    `;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...prompt,
      created_at: prompt.created_at?.toISOString(),
      updated_at: prompt.updated_at?.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { prompt_type, description, active } = body;

    // If this prompt will be active, deactivate others first
    if (active) {
      await sql`
        UPDATE prompts 
        SET active = false 
        WHERE prompt_type = ${prompt_type} 
        AND id != ${params.id} 
        AND active = true
      `;
    }

    // Update the current prompt
    const {
      rows: [result],
    } = await sql`
      UPDATE prompts 
      SET 
        prompt_type = ${prompt_type},
        description = ${description},
        active = ${active},
        updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING id, prompt_type, description, active, created_at, updated_at
    `;

    if (!result) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Fetch complete data
    const {
      rows: [completeResult],
    } = await sql`
      SELECT 
        p.id,
        p.prompt_type,
        p.description,
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
  } catch (error) {
    console.error('Failed to update prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { rowCount } = await sql`
      DELETE FROM prompts 
      WHERE id = ${params.id}
      RETURNING id
    `;

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 },
    );
  }
}
