'use server';

import { z } from 'zod';
import { createInvitation, getInvitationsByResource } from '@/lib/db';
import { sendWorkspaceInvitation } from '@/lib/emailService';

// Validate the request data
const invitationSchema = z.object({
  emails: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: z.enum(['SESSION', 'WORKSPACE']),
  role: z.enum(['admin', 'owner', 'editor', 'viewer', 'none']),
  message: z.string().optional(),
});

export type InvitationResult = {
  success: boolean;
  results?: {
    successful: string[];
    failed: string[];
  };
  error?: string;
  details?: any;
};

/**
 * Server action to create and send invitations
 */
export async function createAndSendInvitations(formData: FormData | Record<string, any>): Promise<InvitationResult> {
  try {
    // Extract data from formData or direct object
    const data = formData instanceof FormData
      ? {
          emails: formData.get('emails') as string,
          resourceId: formData.get('resourceId') as string,
          resourceType: formData.get('resourceType') as 'SESSION' | 'WORKSPACE',
          role: formData.get('role') as 'admin' | 'owner' | 'editor' | 'viewer' | 'none',
          message: formData.get('message') as string | undefined,
        }
      : formData;
    
    // Validate the request
    const validation = invitationSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: 'Invalid request data',
        details: validation.error.format(),
      };
    }
    
    const { emails, resourceId, resourceType, role, message } = validation.data;
    
    // Split email addresses
    const emailList = emails.split(',').map(email => email.trim().toLowerCase());
    
    // Track the results
    const results = {
      successful: [] as string[],
      failed: [] as string[],
    };
    
    // Process each email
    for (const email of emailList) {
      if (!email || !email.includes('@')) {
        results.failed.push(email);
        continue;
      }
      
      // Create invitation record
      const invitation = await createInvitation({
        email,
        resource_id: resourceId,
        resource_type: resourceType,
        role,
        message,
      });
      
      if (!invitation) {
        results.failed.push(email);
        continue;
      }
      
      // Send invitation email
      const emailSent = await sendWorkspaceInvitation(invitation);
      if (emailSent) {
        results.successful.push(email);
      } else {
        results.failed.push(email);
      }
    }
    
    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error processing invitation:', error);
    return {
      success: false,
      error: 'Failed to process invitation',
    };
  }
}

/**
 * Server action to get all invitations for a resource
 */
export async function getResourceInvitations(resourceId: string, resourceType: 'SESSION' | 'WORKSPACE'): Promise<{
  success: boolean;
  invitations?: any[];
  error?: string;
}> {
  try {
    if (!resourceId || !resourceType) {
      return {
        success: false,
        error: 'resourceId and resourceType are required',
      };
    }
    
    const invitations = await getInvitationsByResource(resourceId, resourceType);
    
    return {
      success: true,
      invitations,
    };
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return {
      success: false,
      error: 'Failed to fetch invitations',
    };
  }
}