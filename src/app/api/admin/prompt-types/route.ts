import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function GET() {
  try {
    const dbInstance = await db.getDbInstance();
    
    // Fetch all prompt types
    const promptTypes = await dbInstance
      .selectFrom('prompt_type')
      .select(['id', 'name', 'description', 'created_at', 'updated_at'])
      .orderBy('created_at', 'desc')
      .execute();

    // Format the dates for JSON response
    return NextResponse.json(
      promptTypes.map((type) => ({
        ...type,
        created_at: type.created_at || new Date(),
        updated_at: type.updated_at || new Date(),
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

    // Explicitly type and convert the values
    const name: string = String(body.name);
    const description: string = body.description ? String(body.description) : '';

    // Get the database instance
    const dbInstance = await db.getDbInstance(); // Assuming you've added this function

    // Insert the new prompt type
    const result = await dbInstance
      .insertInto('prompt_type')
      .values({
        name,
        description,
      } as any) // Using 'as any' because of potential id field requirement
      .returning(['name', 'description'])
      .executeTakeFirstOrThrow();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create prompt type:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt type', details: error.message },
      { status: 500 },
    );
  }
}
