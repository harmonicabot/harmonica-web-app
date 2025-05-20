'use server';

import { ResultTabsVisibilityConfig } from '@/lib/schema';
import * as db from '@/lib/db';
import { getWorkspaceById, getHostSessionById } from '@/lib/db';

/**
 * Fetches visibility settings for a resource (session or workspace)
 * @param resourceId The ID of the resource
 * @param resourceType The type of resource ('SESSION' or 'WORKSPACE')
 * @returns The visibility settings or default settings if none exist
 */
export async function getVisibilitySettings(
  resourceId: string,
  resourceType: 'SESSION' | 'WORKSPACE'
): Promise<{
  success: boolean;
  visibilityConfig?: ResultTabsVisibilityConfig;
  error?: string;
}> {
  try {
    // Default visibility config in case none exists
    const defaultConfig: ResultTabsVisibilityConfig = {
      showSummary: true,
      showResponses: true,
      showCustomInsights: true,
      showSimScore: false,
      showChat: true,
      allowCustomInsightsEditing: true,
      showSessionRecap: true,
      showKnowledge: true,
    };

    if (resourceType === 'WORKSPACE') {
      const workspace = await getWorkspaceById(resourceId);
      return {
        success: true,
        visibilityConfig: workspace?.visibility_settings || defaultConfig,
      };
    } else {
      const session = await getHostSessionById(resourceId);
      return {
        success: true,
        visibilityConfig: session?.visibility_settings || defaultConfig,
      };
    }
  } catch (error) {
    console.error('Error fetching visibility settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Updates visibility settings for a resource (session or workspace)
 * @param resourceId The ID of the resource
 * @param settings The new visibility settings
 * @param resourceType The type of resource ('SESSION' or 'WORKSPACE') 
 * @returns Success status and error message if applicable
 */
export async function updateVisibilitySettings(
  resourceId: string,
  settings: ResultTabsVisibilityConfig,
  resourceType: 'SESSION' | 'WORKSPACE'
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.updateVisibilitySettings(resourceId, settings);
    return { success: true };
  } catch (error) {
    console.error('Error updating visibility settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}