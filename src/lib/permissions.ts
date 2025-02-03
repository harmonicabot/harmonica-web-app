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
        
        // TODO: This gives priority of global roles over individual roles. 
        // If we ever want it the other way round (e.g. some users have general admin, but no on some resources?)
        // then we'll have to switch the logic here. I'm not sure which is better...

        // First check for global rights
        const globalPermission = await db.getPermission('global', userId);
        if (globalPermission) {
          setRole(globalPermission.role);
          return; // setLoading will still be set in 'finally'
        }
        
        const permission = await db.getPermission(resourceId, userId);
        setRole(permission?.role || 'none');
      } catch (error) {
        console.error('Permission check failed:', error);
        setRole('none');
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [resourceId, user, isLoading]);

  // Return both the role and utility functions that use it
  return {
    role,
    loading,
    hasMinimumRole: (requiredRole: Role) => 
      ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole],
    compareRole: (otherRole: Role) => 
      ROLE_HIERARCHY[role] - ROLE_HIERARCHY[otherRole]
  };
}
