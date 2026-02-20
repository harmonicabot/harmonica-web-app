import { getSession } from '@auth0/nextjs-auth0';
import { headers } from 'next/headers';
import { createHash } from 'crypto';
import { getApiKeyByHash, getUserById, updateApiKeyLastUsed } from '@/lib/db';
import { unauthorized } from './errors';
import { checkRateLimit } from './rate-limit';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  authMethod: 'session' | 'api_key';
}

/**
 * Hash an API key with SHA-256 for secure lookup.
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Authenticates the request via API key (Bearer token) or Auth0 session.
 * API key takes precedence if Authorization header is present.
 */
export async function authenticateRequest(): Promise<AuthenticatedUser | Response> {
  const headersList = await headers();
  const authorization = headersList.get('authorization');

  // Try API key auth if Bearer token present
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7);

    if (!token.startsWith('hm_live_')) {
      return unauthorized('Invalid API key format');
    }

    const keyHash = hashApiKey(token);
    const apiKey = await getApiKeyByHash(keyHash);
    if (!apiKey) {
      return unauthorized('Invalid or revoked API key');
    }

    // Rate limit check
    const rateLimitResponse = checkRateLimit(keyHash);
    if (rateLimitResponse) return rateLimitResponse;

    // Update last_used_at in background (non-blocking)
    updateApiKeyLastUsed(keyHash);

    // Look up user info
    const user = await getUserById(apiKey.user_id);

    return {
      id: apiKey.user_id,
      email: user?.email || '',
      name: user?.name || null,
      authMethod: 'api_key',
    };
  }

  // Fall back to Auth0 session
  const session = await getSession();
  if (!session?.user) {
    return unauthorized();
  }

  return {
    id: session.user.sub,
    email: session.user.email,
    name: session.user.name || null,
    authMethod: 'session',
  };
}
