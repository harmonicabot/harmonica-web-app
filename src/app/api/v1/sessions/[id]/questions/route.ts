import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../../_lib/auth';
import { forbidden, internalError, notFound } from '../../../_lib/errors';
import { checkSessionAccess } from '../../../_lib/permissions';
import { getHostSessionById } from '@/lib/db';
import type { Question } from '@/lib/api-types';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const { id } = await params;

  try {
    const role = await checkSessionAccess(user, id);
    if (!role) return forbidden();

    const session = await getHostSessionById(id);

    let questions: Question[] = [];
    if (session.questions) {
      const parsed =
        typeof session.questions === 'string'
          ? JSON.parse(session.questions)
          : session.questions;

      if (Array.isArray(parsed)) {
        questions = parsed.map(
          (q: { id?: string; label?: string }, index: number) => ({
            id: q.id || String(index),
            text: q.label || '',
            position: index,
          }),
        );
      }
    }

    return NextResponse.json({ data: questions });
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in GET /api/v1/sessions/[id]/questions:', error);
    return internalError();
  }
}
