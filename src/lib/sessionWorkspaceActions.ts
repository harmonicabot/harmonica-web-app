'use server';

import * as db from "@/lib/db";
import { linkSessionsToWorkspace, unlinkSessionFromWorkspace } from "@/lib/workspaceActions";
import { getSession } from "@auth0/nextjs-auth0";

export async function getAvailableWorkspaces() {
  const session = await getSession();
  const userId = session?.user?.sub;
  
  if (!userId) {
    return [];
  }
  
  const resources = await db.getResourcesForUser(
    userId,
    'WORKSPACE'
  );
  
  if (!resources.length) return [];
  
  const workspaceIds = resources.map(resource => resource.resource_id);
  return await db.getWorkspacesForIds(workspaceIds, ['id', 'title']);
}

export async function addSessionToWorkspaces(sessionId: string, workspaceIds: string[]) {
  if (!workspaceIds.length) return { success: false, message: "No workspaces selected" };
  
  try {
    const results = await Promise.all(
      workspaceIds.map(workspaceId => 
        linkSessionsToWorkspace(workspaceId, [sessionId])
      )
    );
    
    return { 
      success: true, 
      count: results.filter(r => r.success).length 
    };
  } catch (error) {
    console.error("Error adding session to workspaces:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to add session to workspaces" 
    };
  }
}

export async function removeSessionFromWorkspace(workspaceId: string, sessionId: string) {
  try {
    const result = await unlinkSessionFromWorkspace(workspaceId, sessionId);
    return result;
  } catch (error) {
    console.error("Error removing session from workspace:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to remove session from workspace" 
    };
  }
}