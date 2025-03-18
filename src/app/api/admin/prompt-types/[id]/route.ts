import { NextResponse } from 'next/server';
import { createDbInstance } from '@/lib/schema';
import { sql } from '@vercel/postgres';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();

    const {
      rows: [result],
    } = await sql`
      UPDATE prompt_type 
      SET 
        name = ${body.name},
        description = ${body.description},
        updated_at = NOW()
      WHERE name = ${params.id}
      RETURNING name as id, name, description, created_at, updated_at
    `;

    if (!result) {
      return NextResponse.json(
        { error: 'Prompt type not found' },
        { status: 404 },
      );
    }

    // Convert dates to ISO strings for JSON serialization
    const serializedResult = {
      ...result,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };

    return NextResponse.json(serializedResult);
  } catch (error: any) {
    console.error('Failed to update prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt type', details: error.message },
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
  } catch (error: any) {
    console.error('Failed to delete prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt type', details: error.message },
      { status: 500 },
    );
  }
}
