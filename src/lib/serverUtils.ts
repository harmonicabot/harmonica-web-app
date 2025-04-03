'use server';
import * as db from './db';
import { UserProfile } from '@auth0/nextjs-auth0/client';
import { generateMultiSessionSummary } from './summaryMultiSession';
import { getSession } from "@auth0/nextjs-auth0";
import { NewUser } from "./schema";

export async function isAdmin(user: UserProfile) {
  console.log('Admin IDs: ', process.env.ADMIN_ID);
  return (process.env.ADMIN_ID || '').indexOf(user.sub ?? 'NO USER') > -1;
}

/**
 * Ensures the current user exists in our local users table
 * This should be called during authentication flow
 */
export async function syncCurrentUser(): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.user) {
      console.log('No user session found');
      return false;
    }

    const { sub, email, name, picture } = session.user;
    
    if (!sub) {
      console.log('Missing required user ID (sub)');
      return false;
    }

    // Handle case where email might be in the name field
    let userEmail = email;
    let userName = name;
    
    // If email is missing but name contains an email format, use name as email
    if (!userEmail && userName && userName.includes('@')) {
      userEmail = userName;
    }
    
    if (!userEmail) {
      console.log('Missing required email data');
      return false;
    }

    // Create or update user record
    const userData: NewUser = {
      id: sub,
      email: userEmail,
      name: userName || undefined,
      avatar_url: picture || undefined,
    };

    const result = await db.upsertUser(userData);
    return !!result;
  } catch (error) {
    console.error('Error syncing user:', error);
    return false;
  }
}

/**
 * Get the current authenticated user sub
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.user?.sub || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if current user has access to a workspace
 * @param workspaceId The workspace ID to check access for
 * @returns True if the user has access, false otherwise
 */
export async function hasWorkspaceAccess(workspaceId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    
    // Check direct permission
    const permission = await db.getPermission(workspaceId, userId, 'WORKSPACE');
    if (permission) return true;
    
    // Check global permission
    const globalPermission = await db.getPermission('global', userId);
    if (globalPermission) return true;
    
    // Check public access
    const publicPermission = await db.getPermission(workspaceId, 'public', 'WORKSPACE');
    if (publicPermission) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking workspace access:', error);
    return false;
  }
}

/**
 * Check if current user has access to a session
 * @param sessionId The session ID to check access for
 * @returns True if the user has access, false otherwise
 */
export async function hasSessionAccess(sessionId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    
    // Check direct permission
    const permission = await db.getPermission(sessionId, userId, 'SESSION');
    if (permission) return true;
    
    // Check public access
    const publicPermission = await db.getPermission(sessionId, 'public', 'SESSION');
    if (publicPermission) return true;

    // Check global permission
    const globalPermission = await db.getPermission('global', userId);
    if (globalPermission) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking session access:', error);
    return false;
  }
}

// Create a summary for a single session
export async function createSummary(sessionId: string) {
  const summary = await generateMultiSessionSummary([sessionId]);
  console.log('Generated summary:', summary);
  await db.updateHostSession(sessionId, {
    summary: summary.toString(),
    last_edit: new Date(),
  });
  return summary;
}

// Create a summary for multiple sessions
export async function createMultiSessionSummary(
  sessionIds: string[],
  workspaceId: string,
) {
  const summary = await generateMultiSessionSummary(sessionIds);

  await db.updateWorkspace(workspaceId, {
    summary: summary.toString(),
    last_modified: new Date(),
  });
  return summary;
}
