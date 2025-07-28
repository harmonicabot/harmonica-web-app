'use server';

import { put } from '@vercel/blob';
import * as db from '@/lib/db';

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