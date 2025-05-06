'use client';
import { useEffect, useState } from 'react';
import * as db from '@/lib/db';
import { useUser } from '@auth0/nextjs-auth0/client';
import { PermissionsTable } from '@/lib/schema';

export const ROLE_HIERARCHY = {
  none: 0,
  viewer: 1,
  editor: 2,
  owner: 3,
  admin: 4
} as const;

export type Role = PermissionsTable['role'];

export function usePermissions(resourceId: string) {
  const [role, setRole] = useState<Role>('none');
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const { user, isLoading } = useUser();

  useEffect(() => {
    async function checkPermission() {
      setLoading(true);
      try {
        if (isLoading) return;
        const userId = user?.sub;
        if (!userId) {
          setRole('none');
          return;
        }
        
        // If the user has a specific resource permission, then just use that:
        const permission = await db.getPermission(resourceId, userId);
        if (permission) {
          setRole(permission.role);
          return;
        }

        // Otherwise check some 'general' permissions:

        // Use a local variable to keep track of the 'best' role for the user. (Can't rely on 'setRole' because that doesn't get updated immediately)
        let role: Role = 'none';
        // First check for global user rights (i.e. admin) across multiple resources
        const globalPermission = await db.getPermission('global', userId);
        if (globalPermission) {
          role = globalPermission.role;
        }
        
        // Then check for general rights (e.g. public access) of 'all users' for this resource
        // TODO: Ultimately we'd probably also want to cross-check with a 'groups' database for more fine-grained controll...
        const publicPermission = await db.getPermission(resourceId, 'public');
        setIsPublic(!!publicPermission && publicPermission.role !== 'none');
        
        if (publicPermission && !hasMinimumRole(role, publicPermission.role)) {
          role = publicPermission.role
        }

        setRole(role);

      } catch (error) {
        console.error('Permission check failed:', error);
        setRole('none');
        setIsPublic(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [resourceId, user, isLoading]);

  function compareRoles(roleA: Role, roleB: Role): number {
    return ROLE_HIERARCHY[roleA] - ROLE_HIERARCHY[roleB];
  }

  function hasMinimumRole(currentRole: Role, requiredRole: Role): boolean {
    // console.log('Checking role:', currentRole, requiredRole);
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  }

  return {
    role,
    loading,
    isPublic,
    hasMinimumRole: (requiredRole: Role) => hasMinimumRole(role, requiredRole),
    compareRole: (otherRole: Role) => compareRoles(role, otherRole)
  };
}
