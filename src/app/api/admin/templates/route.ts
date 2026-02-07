import { NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const templates = await db.getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, icon, facilitation_prompt, default_session_name } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      );
    }

    const template = await db.createTemplate({
      id: uuidv4(),
      title,
      description: description || null,
      icon: icon || null,
      facilitation_prompt: facilitation_prompt || null,
      default_session_name: default_session_name || null,
      created_by: null,
      workspace_id: null,
      is_public: true,
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      { error: 'Failed to create template', details: error.message },
      { status: 500 },
    );
  }
}
