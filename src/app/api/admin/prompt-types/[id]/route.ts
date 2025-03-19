import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { rows } = await sql`
      SELECT * FROM prompt_type
      WHERE id = ${params.id}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Prompt type not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt type' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const { name, description } = await request.json();

    const { rows } = await sql`
      UPDATE prompt_type
      SET 
        name = ${name},
        description = ${description},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Prompt type not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error updating prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt type' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // First check if there are any prompts using this type
    const { rows: existingPrompts } = await sql`
      SELECT COUNT(*) as count FROM prompts
      WHERE prompt_type = ${params.id}
    `;

    if (parseInt(existingPrompts[0].count) > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete prompt type that is in use',
          message:
            'There are prompts using this type. Please delete or reassign those prompts first.',
        },
        { status: 400 },
      );
    }

    const { rowCount } = await sql`
      DELETE FROM prompt_type
      WHERE id = ${params.id}
      RETURNING id
    `;

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Prompt type not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt type' },
      { status: 500 },
    );
  }
}
