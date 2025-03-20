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
    
    if (!sub || !email) {
      console.log('Missing required user data');
      return false;
    }

    // Create or update user record
    const userData: NewUser = {
      id: sub,
      email: email,
      name: name || undefined,
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

// Create a summary for a single session
export async function createSummary(sessionId: string) {
  const summary = await generateMultiSessionSummary([sessionId]);

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
