'use server';

import { getSession } from '@auth0/nextjs-auth0';
import {
  getInvitationsByEmail,
  markInvitationAsAccepted,
  setPermission,
} from '@/lib/db';
import { syncCurrentUser } from '@/lib/serverUtils';

/**
 * Server action to process invitations for the current user
 * This function is called after authentication to process any pending invitations
 */
export async function processUserInvitations(): Promise<{
  success: boolean;
  processed: number;
  error?: string;
}> {
  try {
    // Get the authenticated user
    const session = await getSession();
    if (!session || !session.user) {
      console.log(`User session not available`);

      return {
        success: false,
        error: 'Not authenticated',
        processed: 0,
      };
    }

    // Get user email - handle cases where email might be in the name field
    let userEmail = session.user.email;
    let userName = session.user.name;

    // If email is missing but name contains an email format, use name as email
    if (!userEmail && userName && userName.includes('@')) {
      userEmail = userName;
    }

    const userId = session.user.sub;

    if (!userEmail || !userId) {
      console.log(
        `User email or ID (sub) not available: `,
        JSON.stringify(session.user, null, 2)
      );

      return {
        success: false,
        error: 'User email or ID (sub) not available',
        processed: 0,
      };
    }

    // Ensure user profile is saved in our database
    await syncCurrentUser();

    // Find pending invitations for this email
    const invitations = await getInvitationsByEmail(userEmail);
    console.log(
      `Found ${invitations.length} pending invitations for ${userEmail}`
    );
    let processed = 0;

    // Process each invitation
    for (const invitation of invitations) {
      // Set permission based on the invitation
      const success = await setPermission(
        invitation.resource_id,
        invitation.role,
        invitation.resource_type,
        userId
      );

      if (success) {
        // Mark invitation as accepted
        await markInvitationAsAccepted(invitation.id);
        processed++;
      }
    }

    console.log(`Processed ${processed} invitations for user ${userEmail}`);
    return {
      success: true,
      processed,
    };
  } catch (error) {
    console.error('Error processing invitations:', error);
    return {
      success: false,
      error: 'Failed to process invitations',
      processed: 0,
    };
  }
}
