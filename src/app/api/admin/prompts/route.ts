import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { NewPrompt } from '@/lib/schema';

export async function GET() {
  try {
    // Use the existing getAllPrompts function from db.ts
    const prompts = await db.getAllPrompts();
    console.log('Fetched prompts:', prompts);
    // Format the dates for JSON response
    const formattedPrompts = prompts.map(prompt => ({
      ...prompt,
      created_at: prompt.created_at || new Date(),
      updated_at: prompt.updated_at || new Date(),
    }));

    return NextResponse.json(formattedPrompts);
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
    // Explicitly type and convert the values
    const prompt_type: string = String(body.prompt_type);
    const instructions: string = String(body.instructions);
    const active: boolean = body.active === undefined ? true : Boolean(body.active);
    if (!prompt_type) {
      return NextResponse.json(
        { error: 'Prompt type is required' },
        { status: 400 },
      );
    }

    // Get the database instance
    const dbInstance = await db.getDbInstance();

    // Deactivate other prompts of the same type if this one will be active
    if (active) {
      await dbInstance
        .updateTable('prompts')
        .set({ active: false })
        .where('prompt_type', '=', prompt_type)
        .where('active', '=', true)
        .execute();
    }

    const values: NewPrompt = {
      prompt_type,
      instructions,
      active,
    };

    // Create the new prompt
    const result = await dbInstance
      .insertInto('prompts')
      .values(values)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get the complete result with type information
    const completeResult = await dbInstance
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
      .where('p.id', '=', result.id)
      .executeTakeFirstOrThrow();

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
