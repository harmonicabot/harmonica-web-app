'use server'

import * as db from '@/lib/db';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';

export async function getSummaryVersion(resourceId: string, isProject = false) {
  if (!resourceId) {
    throw new Error('resourceId is required');
  }

  try {
    // Get host session data
    const host = await db.getHostSessionById(resourceId);
    
    // Get all user sessions for this session  
    const userData = await db.getUsersBySessionId(resourceId);
    
    // Reuse the existing checkSummaryAndMessageTimes logic
    const { lastMessage, lastSummaryUpdate } = checkSummaryAndMessageTimes(host, userData);
    
    return {
      last_edit: lastMessage,
      last_summary_update: lastSummaryUpdate,
      resourceId
    };
  } catch (error) {
    console.error('Error fetching summary version:', error);
    throw error;
  }
}

export async function updateUserLastEdit(userSessionId: string) {
  if (!userSessionId) {
    throw new Error('userSessionId is required');
  }

  try {
    const now = new Date();
    await db.updateUserSession(userSessionId, { last_edit: now });
    return { success: true, lastEdit: now.toISOString() };
  } catch (error) {
    console.error('Error updating user last_edit:', error);
    throw error;
  }
}

export async function updateHostLastEdit(sessionId: string) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  try {
    const now = new Date();
    await db.updateHostSession(sessionId, { last_edit: now });
    return { success: true, lastEdit: now.toISOString() };
  } catch (error) {
    console.error('Error updating host last_edit:', error);
    throw error;
  }
}

export async function updateLastSummaryUpdate(sessionId: string) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  try {
    const now = new Date();
    // Update host session last_edit - this IS the summary update timestamp
    await db.updateHostSession(sessionId, { last_edit: now });
    return { success: true, lastSummaryUpdate: now.toISOString() };
  } catch (error) {
    console.error('Error updating last_summary_update:', error);
    throw error;
  }
}
