import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { forbidden, internalError, notFound } from '../../_lib/errors';
import { checkSessionAccess } from '../../_lib/permissions';
import { toSession } from '../../_lib/mappers';
import { getHostSessionById } from '@/lib/db';

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
    return NextResponse.json(toSession(session));
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in GET /api/v1/sessions/[id]:', error);
    return internalError();
  }
}
