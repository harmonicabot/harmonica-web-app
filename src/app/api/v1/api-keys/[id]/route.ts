import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { revokeApiKey } from '@/lib/db';
import { unauthorized, notFound, internalError } from '../../_lib/errors';

/**
 * DELETE /api/v1/api-keys/[id] — Revoke an API key (session auth only).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const { id } = await params;

  try {
    const revoked = await revokeApiKey(id, session.user.sub);
    if (!revoked) return notFound('API key not found');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/v1/api-keys/[id]:', error);
    return internalError();
  }
}
