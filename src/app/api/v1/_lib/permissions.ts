import { getRoleForUser } from '@/lib/db';
import { ROLE_HIERARCHY, type Role } from '@/lib/roles';
import type { AuthenticatedUser } from './auth';

/**
 * Checks if the authenticated user has at least the required role on a session.
 * Returns the user's effective role if sufficient, null if insufficient.
 */
export async function checkSessionAccess(
  user: AuthenticatedUser,
  sessionId: string,
  requiredRole: Role = 'viewer',
): Promise<Role | null> {
  let bestRole: Role = 'none';

  const permission = await getRoleForUser(sessionId, user.id, 'SESSION');
  if (permission && ROLE_HIERARCHY[permission.role] > ROLE_HIERARCHY[bestRole]) {
    bestRole = permission.role;
  }

  const publicPermission = await getRoleForUser(sessionId, 'public');
  if (publicPermission && ROLE_HIERARCHY[publicPermission.role] > ROLE_HIERARCHY[bestRole]) {
    bestRole = publicPermission.role;
  }

  const globalPermission = await getRoleForUser('global', user.id);
  if (globalPermission && ROLE_HIERARCHY[globalPermission.role] > ROLE_HIERARCHY[bestRole]) {
    bestRole = globalPermission.role;
  }

  if (ROLE_HIERARCHY[bestRole] >= ROLE_HIERARCHY[requiredRole]) {
    return bestRole;
  }

  return null;
}
