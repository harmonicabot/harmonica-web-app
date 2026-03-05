import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../_lib/auth';
import {
  forbidden,
  internalError,
  notFound,
  validationError,
} from '../../_lib/errors';
import { checkSessionAccess } from '../../_lib/permissions';
import { toSession } from '../../_lib/mappers';
import {
  getHostSessionById,
  getNumUsersAndMessages,
  updateHostSession,
} from '@/lib/db';
import { getUserStats } from '@/lib/clientUtils';
import type { UpdateSessionRequest } from '@/lib/api-types';

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

const ALLOWED_UPDATE_FIELDS: (keyof UpdateSessionRequest)[] = [
  'topic',
  'goal',
  'context',
  'critical',
  'prompt',
];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const { id } = await params;

  try {
    const role = await checkSessionAccess(user, id, 'editor');
    if (!role) return forbidden();

    const body = (await req.json()) as Record<string, unknown>;

    // Filter to only allowed fields
    const update: Record<string, unknown> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return validationError(
        'No valid fields provided. Allowed fields: ' +
          ALLOWED_UPDATE_FIELDS.join(', '),
      );
    }

    const updated = await updateHostSession(id, update);
    const stats = await getNumUsersAndMessages([id]);
    const count = stats[id] ? getUserStats(stats, id).totalUsers : 0;
    return NextResponse.json(toSession(updated, count));
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in PATCH /api/v1/sessions/[id]:', error);
    return internalError();
  }
}
