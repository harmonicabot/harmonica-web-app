'use server';
import * as db from './db';
import { UserProfile } from '@auth0/nextjs-auth0/client';
import { generateSummary } from './summaryMultiSession';
import { getSession } from '@auth0/nextjs-auth0';
import { NewUser, NewHostSession } from './schema';
import { updateResourcePermission } from 'app/actions/permissions';
import { getPromptInstructions } from '@/lib/promptsCache';
import { getPostHogClient } from '@/lib/posthog-server';

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

    // Check if this is a new user before upserting
    const existingUser = await db.getUserById(sub);

    // Create or update user record
    const userData: NewUser = {
      id: sub,
      email: userEmail,
      name: userName || undefined,
      avatar_url: picture || undefined,
      subscription_status: 'FREE',
    };

    const result = await db.upsertUser(userData);

    // Track new signups
    if (!existingUser && result) {
      const posthog = getPostHogClient();
      posthog?.capture({
        distinctId: sub,
        event: 'user_signed_up',
        properties: {
          email: userEmail,
          auth_provider: sub.split('|')[0] || 'unknown',
        },
      });
    }

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
 * Check if current user has access to a session or workspace
 * @param resourceId The session or workspace ID to check access for
 * @returns True if the user has access, false otherwise
 */
export async function hasAccessToResource(
  resourceId: string,
): Promise<boolean> {
  try {
    // Check public access
    const publicPermission = await db.getRoleForUser(
      resourceId,
      'public',
    );
    if (publicPermission) return true;

    const userId = await getCurrentUserId();
    if (!userId) return false;

    // Check direct permission
    const permission = await db.getRoleForUser(resourceId, userId);
    if (permission) return true;

    // Check global permission
    const globalPermission = await db.getRoleForUser('global', userId);
    if (globalPermission) return true;

    return false;
  } catch (error) {
    console.error(`Error checking access for resource ${resourceId}:`, error);
    return false;
  }
}

export async function fetchPromptInstructions(promptName: string) {
  return await getPromptInstructions(promptName);
}

// Create a summary for a single session
export async function createSummary(sessionId: string) {
  const sessionSummaryPrompt = await db.getFromHostSession(sessionId, ['summary_prompt']);
  const summaryPrompt = sessionSummaryPrompt?.summary_prompt ?? await getPromptInstructions('SUMMARY_PROMPT');
  const summary = await generateSummary([sessionId], summaryPrompt);
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
  const workspace = await db.getWorkspaceById(workspaceId);
  const summaryPrompt = workspace?.summary_prompt ?? await getPromptInstructions('PROJECT_SUMMARY_PROMPT');
  const summary = await generateSummary(sessionIds, summaryPrompt);

  await db.updateWorkspace(workspaceId, {
    summary: summary.toString(),
    last_modified: new Date(),
  });
  return summary;
}

export async function getSummaryVersion(resourceId: string) {
  if (!resourceId) {
    throw new Error('resourceId is required');
  }

  try {
    // Only fetch the last_edit column for efficiency
    const result = await db.getFromHostSession(resourceId, ['last_edit']);
    
    if (!result) {
      throw new Error('Resource not found');
    }

    return {
      lastUpdated: result.last_edit.toISOString(),
      resourceId
    };
  } catch (error) {
    console.error('Error fetching summary version:', error);
    throw error;
  }
}

export async function cloneSession(sessionId: string): Promise<string | null> {
  try {
    // Get the session to clone
    const sessionToClone = await db.getHostSessionById(sessionId);
    
    if (!sessionToClone) {
      console.error(`Session with ID ${sessionId} not found`);
      return null;
    }
    
    // Get current user for permissions
    const session = await getSession();
    const userSub = session?.user?.sub;
    
    if (!userSub) {
      console.warn('No user ID found when cloning session');
      return null;
    }
    
    // Create a new session with the cloned data
    const newSessionData: NewHostSession = {
      active: true, // inactive = finished; 'draft' = 
      num_sessions: 0,
      num_finished: 0,
      prompt: sessionToClone.prompt,
      assistant_id: sessionToClone.assistant_id,
      template_id: sessionToClone.template_id,
      summary_assistant_id: sessionToClone.summary_assistant_id,
      topic: `${sessionToClone.topic} (Copy)`,
      final_report_sent: false,
      start_time: new Date(),
      goal: sessionToClone.goal,
      critical: sessionToClone.critical,
      context: sessionToClone.context,
      prompt_summary: sessionToClone.prompt_summary,
      questions: sessionToClone.questions ? JSON.stringify(sessionToClone.questions) as unknown as JSON : undefined,
    };
    
    // Create the new session
    const newSessionIds = await db.insertHostSessions(newSessionData);
    if (!newSessionIds || newSessionIds.length === 0) {
      throw new Error('Failed to create new session');
    }
    const newSessionId = newSessionIds[0];
    
    // Set the current user as the owner of the new session
    await updateResourcePermission(newSessionId, userSub, 'owner', 'SESSION');
    
    return newSessionId;
  } catch (error) {
    console.error('Error cloning session:', error);
    return null;
  }
}
