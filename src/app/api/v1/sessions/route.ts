import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../_lib/auth';
import { internalError } from '../_lib/errors';
import { toSessionListItem } from '../_lib/mappers';
import { getResourcesForUser, listSessionsForUser } from '@/lib/db';
import type { SessionStatus } from '@/lib/api-types';

export async function GET(req: NextRequest) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') as SessionStatus | null;
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const permissions = await getResourcesForUser(user.id, 'SESSION');
    const sessionIds = permissions.map((p) => p.resource_id);

    const { sessions, total } = await listSessionsForUser(sessionIds, {
      status: status || undefined,
      search: q,
      limit,
      offset,
    });

    return NextResponse.json({
      data: sessions.map(toSessionListItem),
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('Error in GET /api/v1/sessions:', error);
    return internalError();
  }
}
