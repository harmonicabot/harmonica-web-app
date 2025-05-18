import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const dbInstance = await db.getDbInstance();
    
    const promptType = await dbInstance
      .selectFrom('prompt_type')
      .selectAll()
      .where('id', '=', params.id)
      .executeTakeFirst();

    if (!promptType) {
      return NextResponse.json(
        { error: 'Prompt type not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(promptType);
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
    
    const dbInstance = await db.getDbInstance();

    const updatedPromptType = await dbInstance
      .updateTable('prompt_type')
      .set({
        name,
        description,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedPromptType) {
      return NextResponse.json(
        { error: 'Prompt type not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedPromptType);
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
    const dbInstance = await db.getDbInstance();
    
    // First check if there are any prompts using this type
    const promptCount = await dbInstance
      .selectFrom('prompts')
      .select(({ fn }) => [fn.count('id').as('count')])
      .where('prompt_type', '=', params.id)
      .executeTakeFirstOrThrow();

    if (Number(promptCount.count) > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete prompt type that is in use',
          message:
            'There are prompts using this type. Please delete or reassign those prompts first.',
        },
        { status: 400 },
      );
    }

    const deletedPromptType = await dbInstance
      .deleteFrom('prompt_type')
      .where('id', '=', params.id)
      .returningAll()
      .executeTakeFirst();

    if (!deletedPromptType) {
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