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
        db.createWorkspaceSessionLink(workspaceId, sessionId)
      )
    );
    
    return { success: true, count: results.length };
  } catch (error) {
    console.error('Error linking sessions to workspace:', error);
    throw new Error('Failed to link sessions to workspace');
  }
}