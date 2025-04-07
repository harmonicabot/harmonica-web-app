import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const dbInstance = await db.getDbInstance();
    
    const prompt = await dbInstance
      .selectFrom('prompts as p')
      .innerJoin('prompt_type as pt', 'p.prompt_type', 'pt.id')
      .select([
        'p.id',
        'p.prompt_type',
        'p.instructions',
        'p.active',
        'p.created_at',
        'p.updated_at',
        'pt.id as type_id',
        'pt.name as type_name',
        'pt.description as type_description',
      ])
      .where('p.id', '=', params.id)
      .executeTakeFirst();

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
    const { id } = params;
    const { prompt_type, instructions, active } = await request.json();

    const dbInstance = await db.getDbInstance();

    // If setting this prompt to active, first deactivate any other active prompts of the same type
    if (active) {
      await dbInstance
        .updateTable('prompts')
        .set({ active: false })
        .where('prompt_type', '=', prompt_type)
        .where('id', '!=', id)
        .where('active', '=', true)
        .execute();
    }

    // Update the prompt in the database
    const updatedPrompt = await dbInstance
      .updateTable('prompts')
      .set({
        prompt_type,
        instructions,
        active,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedPrompt,
      created_at: updatedPrompt.created_at?.toISOString(),
      updated_at: updatedPrompt.updated_at?.toISOString(),
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
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
    const dbInstance = await db.getDbInstance();
    
    const deletedPrompt = await dbInstance
      .deleteFrom('prompts')
      .where('id', '=', params.id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedPrompt) {
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