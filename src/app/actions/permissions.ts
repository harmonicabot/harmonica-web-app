'use server';

import { setPermission, removePermission, deleteInvitation } from '@/lib/db';
import { getSession } from '@auth0/nextjs-auth0';
import { Invitation, User } from '@/lib/schema';
import { Role } from '@/lib/permissions';

/**
 * Update permission for a user on a resource
 */
export async function updateResourcePermission(
  resourceId: string,
  userId: string,
  role: Role,
  resourceType: 'SESSION' | 'WORKSPACE'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user for permission check
    const session = await getSession();
    if (!session?.user?.sub) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    // TODO: Add permission check to ensure current user can modify permissions
    
    const result = await setPermission(resourceId, role, resourceType, userId);
    return { success: result };
  } catch (error) {
    console.error('Error updating permission:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Remove a user's permission for a resource
 */
export async function removeResourcePermission(
  resourceId: string,
  userId: string,
  resourceType: 'SESSION' | 'WORKSPACE'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user for permission check
    const session = await getSession();
    if (!session?.user?.sub) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    // TODO: Add permission check to ensure current user can remove permissions
    // TODO: Add check to prevent removing the last owner

    const result = await removePermission(resourceId, userId, resourceType);
    return { success: result };
  } catch (error) {
    console.error('Error removing permission:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

type UserAndRole = User & { role: Role };

/**
 * Get all permissions and pending invitations for a resource
 */
export async function getResourcePermissions(
  resourceId: string,
  resourceType: 'SESSION' | 'WORKSPACE'
): Promise<{ 
  success: boolean; 
  permissions?: UserAndRole[] | undefined; 
  pendingInvitations?: Invitation[];
  error?: string 
}> {
  try {
    // Get permissions with user data if available
    const { getUsersWithPermissionsForResource, getPermissions } = await import('@/lib/db');
    
    let permissionsWithUserData;
    try {
      // Try to get permissions with joined user data
      permissionsWithUserData = await getUsersWithPermissionsForResource(resourceId, resourceType);
    } catch (error) {
      // Fallback to just getting permissions without user data
      console.warn('Error getting permissions with user data, falling back to basic permissions:', error);
      const basicPermissions = await getPermissions(resourceId, resourceType);
      permissionsWithUserData = basicPermissions.map(p => ({
        ...p,
        // These would be populated with real user data
        email: p.user_id.includes('@') ? p.user_id : undefined,
        name: undefined
      }));
    }
    
    // Get pending invitations
    const { getInvitationsByResource } = await import('@/lib/db');
    const pendingInvitations = await getInvitationsByResource(resourceId, resourceType);
    
    // Filter to only include pending (not accepted) invitations
    const filteredInvitations = pendingInvitations.filter(inv => !inv.accepted);
    
    return { 
      success: true, 
      permissions: permissionsWithUserData as UserAndRole[],
      pendingInvitations: filteredInvitations
    };
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user for permission check
    const session = await getSession();
    if (!session?.user?.sub) {
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }

    // TODO: Add permission check to ensure current user can cancel invitations
    
    const result = await deleteInvitation(invitationId);
    return { success: result };
  } catch (error) {
    console.error('Error canceling invitation:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}