import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { getSession } from '@auth0/nextjs-auth0';
import { createApiKey, getApiKeysForUser } from '@/lib/db';
import { unauthorized, validationError, internalError } from '../_lib/errors';

/**
 * GET /api/v1/api-keys — List the user's API keys (session auth only).
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  try {
    const keys = await getApiKeysForUser(session.user.sub);

    return NextResponse.json({
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.key_prefix,
        created_at: k.created_at.toISOString(),
        last_used_at: k.last_used_at?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Error in GET /api/v1/api-keys:', error);
    return internalError();
  }
}

/**
 * POST /api/v1/api-keys — Create a new API key (session auth only).
 * Returns the raw key ONCE — it cannot be retrieved again.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const name = body?.name || null;

    if (name && (typeof name !== 'string' || name.length > 255)) {
      return validationError('name must be a string of 255 characters or less');
    }

    // Generate key: hm_live_ + 32 random hex chars
    const rawKey = `hm_live_${randomBytes(16).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12); // "hm_live_xxxx"

    const apiKey = await createApiKey({
      user_id: session.user.sub,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: keyPrefix,
        key: rawKey, // Only returned once!
        created_at: apiKey.created_at.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/v1/api-keys:', error);
    return internalError();
  }
}
