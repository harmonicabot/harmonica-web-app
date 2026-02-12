import { NextResponse } from 'next/server';
import { authenticateRequest } from '../_lib/auth';
import { internalError, notFound } from '../_lib/errors';
import { getUserById } from '@/lib/db';

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const dbUser = await getUserById(user.id);
    if (!dbUser) return notFound('User not found');

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || null,
      subscription_status: dbUser.subscription_status || 'FREE',
      api_key: null, // HAR-56: populate with actual API key metadata
    });
  } catch (error) {
    console.error('Error in GET /api/v1/me:', error);
    return internalError();
  }
}
