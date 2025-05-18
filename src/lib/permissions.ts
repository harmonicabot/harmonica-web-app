'use client';
import { useCallback, useEffect, useState } from 'react';
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
      
      // Use a local variable to keep track of the 'best' role for the user. (Can't rely on 'setRole' because that doesn't get updated immediately)
      // This var being the same name is intentional so that we don't accidentally use the state var and expect the effect to be immediate.
      let role: Role = 'none';
      
      try {
        if (isLoading) return;

        // First, check whether the resource is publicly available, and set that as the minimum role. 
        // (We might not even need the userId to give permissions in that case...)
        const publicPermission = await db.getRoleForUser(resourceId, 'public');
        if (publicPermission) {
          role = publicPermission.role;
          setIsPublic(publicPermission.role !== 'none');
        }

        const userId = user?.sub;
        if (!userId) {
          setRole(role);
          return;
        }
        
        // Check specific user permissions:
        const permission = await db.getRoleForUser(resourceId, userId);
        if (permission) {
          role = getBiggerRole(role, permission.role);
        }

        // Finally, check for global user rights (i.e. admin) across multiple resources
        const globalPermission = await db.getRoleForUser('global', userId);
        if (globalPermission) {
          role = getBiggerRole(role, globalPermission.role);
        }
        
        setRole(role);

      } catch (error) {
        console.error('Permission check failed:', error);
        setRole(role);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [resourceId, user, isLoading]);

  function hasMinimumRole(currentRole: Role, requiredRole: Role): boolean {
    // console.log('Checking role:', currentRole, requiredRole);
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  }

  function getBiggerRole(currentRole: Role, newRole: Role): Role {
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[newRole] ? currentRole : newRole;
  }

  // Memoize the hasMinimumRole function so that it doesn't get recreated on every render
  const hasMinimumRoleCallback = useCallback(
    (requiredRole: Role) => {
      const hasMinimumRole = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
      console.log(`Is ${role} at least ${requiredRole}?`, hasMinimumRole);
      return hasMinimumRole;
    },
    [role] // Only recreate when role changes
  );

  return {
    loading,
    isPublic,
    hasMinimumRole: hasMinimumRoleCallback
  };
}
