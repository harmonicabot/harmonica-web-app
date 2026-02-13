import { NextResponse } from 'next/server';
import { authenticateRequest } from '../_lib/auth';
import { internalError, notFound } from '../_lib/errors';
import { getUserById, getApiKeysForUser } from '@/lib/db';

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const dbUser = await getUserById(user.id);
    if (!dbUser) return notFound('User not found');

    const keys = await getApiKeysForUser(user.id);
    const latestKey = keys[0] || null; // Most recent, sorted by created_at desc

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || null,
      subscription_status: dbUser.subscription_status || 'FREE',
      api_key: latestKey
        ? {
            name: latestKey.name,
            key_prefix: latestKey.key_prefix,
            created_at: latestKey.created_at.toISOString(),
            last_used_at: latestKey.last_used_at?.toISOString() || null,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in GET /api/v1/me:', error);
    return internalError();
  }
}
