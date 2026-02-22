import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import { forbidden, internalError, notFound } from '../../_lib/errors';
import { checkSessionAccess } from '../../_lib/permissions';
import { toSession } from '../../_lib/mappers';
import { getHostSessionById, getNumUsersAndMessages } from '@/lib/db';
import { getUserStats } from '@/lib/clientUtils';

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
    const stats = await getNumUsersAndMessages([id]);
    const count = stats[id] ? getUserStats(stats, id).totalUsers : 0;
    return NextResponse.json(toSession(session, count));
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in GET /api/v1/sessions/[id]:', error);
    return internalError();
  }
}
