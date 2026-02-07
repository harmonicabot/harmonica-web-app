import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, icon, facilitation_prompt, default_session_name, template_type, chain_config } = body;

    const updated = await db.updateTemplate(id, {
      title,
      description: description || null,
      icon: icon || null,
      facilitation_prompt: facilitation_prompt || null,
      default_session_name: default_session_name || null,
      template_type: template_type || 'single',
      chain_config: chain_config ? JSON.stringify(chain_config) : null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const deleted = await db.deleteTemplate(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 },
    );
  }
}
