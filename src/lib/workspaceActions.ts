'use server';

import * as db from '@/lib/db';

/**
 * Links one or more sessions to a workspace
 */
export async function linkSessionsToWorkspace(workspaceId: string, sessionIds: string[]) {
  try {
    // Create entries in the WorkspaceSessionsTable for each session
    const results = await Promise.all(
      sessionIds.map(sessionId => 
        db.addSessionToWorkspace(workspaceId, sessionId)
      )
    );
    
    return { success: true, count: results.length };
  } catch (error) {
    console.error('Error linking sessions to workspace:', error);
    throw new Error('Failed to link sessions to workspace');
  }
}

export async function unlinkSessionFromWorkspace(
  workspaceId: string, 
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.removeSessionFromWorkspace(workspaceId, sessionId);
    return { success: result };
  } catch (error) {
    console.error('Error unlinking session from workspace:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}