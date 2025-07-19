'use server'

import * as db from '@/lib/db';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';

export async function checkSummaryNeedsUpdating(resourceId: string, isProject = false) {
  if (!resourceId) {
    throw new Error('resourceId is required');
  }

  if (isProject) {
    throw new Error('Automatic Project Summary updates are not implemented yet');
  } else {
    try {
      // Get host session data
      const host = await db.getHostSessionById(resourceId);
    
      // Get all user sessions for this session  
      const userData = await db.getUsersBySessionId(resourceId);
    
      // Reuse the existing checkSummaryAndMessageTimes logic
      const { lastMessage, lastSummaryUpdate } = checkSummaryAndMessageTimes(host, userData);
      // When users are toggled (include/exclude in summary) it is stored directly on the userData, so check that as well
      const lastUserEdit = userData.reduce((latest, user) => {
        const lastEditTime = new Date(user.last_edit).getTime();
        return lastEditTime > latest ? lastEditTime : latest;
      }, 0);
    
      const lastEdit = Math.max(lastMessage, lastUserEdit);
      return {
        lastEdit,
        lastSummaryUpdate,
        resourceId
      };
    } catch (error) {
      console.error('Error fetching summary version:', error);
      throw error;
    }
  }
}

export async function updateUserLastEdit(userSessionId: string) {
  if (!userSessionId) {
    throw new Error('userId is required');
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

export async function fetchSummary(resourceId: string, isProject = false) {
  if (!resourceId) {
    throw new Error('resourceId is required');
  }

  try {
    if (isProject) {
      // For projects, get workspace summary
      return await db.getWorkspaceSummary(resourceId);
    } else {
      // For sessions, get host session summary
      const host = await db.getHostSessionById(resourceId);
      return host.summary || '';
    }
  } catch (error) {
    console.error('Error fetching summary:', error);
    throw error;
  }
}
