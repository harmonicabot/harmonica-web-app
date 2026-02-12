import { getSession } from '@auth0/nextjs-auth0';
import { unauthorized } from './errors';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  authMethod: 'session' | 'api_key';
}

/**
 * Authenticates the request and returns the user.
 * Currently supports Auth0 session auth only.
 * HAR-56 will extend this to check Bearer token in Authorization header.
 */
export async function authenticateRequest(): Promise<AuthenticatedUser | Response> {
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
