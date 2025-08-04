'use server';

import { put } from '@vercel/blob';
import * as db from '@/lib/db';
import { getSession } from '@auth0/nextjs-auth0';
import { NewWorkspace, HostSession, UserSession } from '@/lib/schema';
import { hasAccessToResource } from '@/lib/serverUtils';
import { ExtendedWorkspaceData } from '@/lib/types';

export async function deleteWorkspace(id: string) {
  try {
    // We can only 'soft delete' the workspace; if we _totally_ delete it it would just immediately be recreated because of the... mechanism.
    // Instead, we mark it here for deletion, then the next time fetchWorkspaceData is called (often immediately) it will be 'properly' deleted. 
    await db.updateWorkspace(id, { status: 'deleted' })
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return { success: false, error: 'Failed to delete workspace' };
  }
}

export async function uploadBanner(
  formData: FormData
) {
  console.log("Uploading banner image...");
  // Get necessary data
  const file = formData.get('file') as File;
  const workspaceId = formData.get('workspaceId') as string;
  
  if (!workspaceId || !file) {
    throw new Error('Missing required fields');
  }

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('Only images are allowed');
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    throw new Error('File too large (max 5MB)');
  }

  // Upload to Vercel Blob
  const secureFilename = `workspace_${workspaceId}_banner_${Date.now()}.${file.name.split('.').pop()}`;
  
  const blob = await put(secureFilename, file, {
    access: 'public',
  });

  return blob.url;
}

export async function fetchWorkspaceDataAction(workspaceId: string): Promise<ExtendedWorkspaceData> {
  console.log("Fetching project data for workspace ", workspaceId);
  
  // Helper function to get available sessions for linking
  async function getAllAvailableSessionIds() {
    const session = await getSession();
    const userId = session?.user?.sub;    
    const availableResources = await db.getResourcesForUser(userId, "SESSION", ["resource_id"]);
    const availableSessionsIds = availableResources.map((r) => r.resource_id).filter((id) => id !== 'global');
    let availableSessions: ExtendedWorkspaceData["availableSessions"] = [];
    if (availableSessionsIds.length > 0) {
      availableSessions = await db.getHostSessionsForIds(availableSessionsIds, [
        'id',
        'topic',
        'start_time'
      ]);
    }
    return availableSessions;
  }
  
  // First, check whether this workspace exists at all. If not, add a 'draft' mode with the current user as the owner:
  const workspaceExists = await db.hasWorkspace(workspaceId);
  if (!workspaceExists) {
    const draftWorkspace: NewWorkspace = {
      id: workspaceId,
      title: "New Project",
      status: 'draft',
      gradientFrom: '#6B21A8',
      gradientTo: '#9333EA',
      useGradient: true,
    };
    
    await db.createWorkspace(draftWorkspace);
    await db.setPermission(workspaceId, 'owner', 'WORKSPACE');
    const availableSessions = await getAllAvailableSessionIds();
    
    return {
      exists: false,
      workspace: draftWorkspace,
      hostSessions: [],
      userData: [],
      sessionIds: [],
      availableSessions
    };
  }

  // Check if user has access to this workspace
  const hasAccess = await hasAccessToResource(workspaceId);
  if (!hasAccess) {
    throw new Error('Access denied: You do not have permission to view this Project');
  }

  let workspaceData = await db.getWorkspaceById(workspaceId);
  if (!workspaceData) {
    throw new Error('Project not found');
  }
  if (workspaceData.status == 'deleted') {
    // The workspace was marked for deletion, but hasn't actually been deleted. Let's do that now.
    await db.deleteWorkspace(workspaceId);
    console.log("Deleting ", workspaceId);
    throw new Error('Project has been removed.');
  }
  
  const availableSessions = await getAllAvailableSessionIds();

  console.log(`Found Project ${workspaceId}!`);
  // Fetch all necessary data for existing workspace
  const sessionIds = await db.getWorkspaceSessionIds(workspaceId);
  
  let hostSessions: HostSession[];
  let allUserData: UserSession[][];
  
  // Fetch host sessions and user sessions
  [hostSessions, allUserData] = await Promise.all([
    Promise.all(sessionIds.map((id) => db.getHostSessionById(id))),
    Promise.all(sessionIds.map((id) => db.getUsersBySessionId(id))),
  ]);

  // Get stats for all sessions
  const stats = await db.getNumUsersAndMessages(
    hostSessions.map((session) => session.id),
  );
  
  // Flatten user data (no filtering by message count - let client handle this)
  const userData = allUserData.flat();

  return {
    exists: workspaceData.status !== 'draft',
    workspace: workspaceData,
    hostSessions,
    userData,
    sessionIds,
    availableSessions,
  };
}

export async function fetchAvailableSessionsAction() {
  const session = await getSession();
  const userId = session?.user?.sub;    
  const availableResources = await db.getResourcesForUser(userId, "SESSION", ["resource_id"]);
  const availableSessionsIds = availableResources.map((r) => r.resource_id).filter((id) => id !== 'global');
  
  if (availableSessionsIds.length > 0) {
    return await db.getHostSessionsForIds(availableSessionsIds, [
      'id', 'topic', 'start_time'
    ]);
  }
  return [];
}

export async function fetchAvailableWorkspacesAction() {
  const session = await getSession();
  const userId = session?.user?.sub;
  
  if (!userId) {
    return [];
  }
  
  const resources = await db.getResourcesForUser(userId, 'WORKSPACE');
  if (!resources.length) return [];
  
  const workspaceIds = resources.map(resource => resource.resource_id);
  return await db.getWorkspacesForIds(workspaceIds, ['id', 'title']);
}