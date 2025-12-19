'use server';

import { nanoid } from 'nanoid';
import { getDbInstance } from '@/lib/db';
import { sendEmail } from '@/lib/emailService';

export async function generateShareToken(userSessionId: string): Promise<string> {
  const db = await getDbInstance();
  const token = nanoid(21);

  await db
    .insertInto('transcript_share_tokens')
    .values({ token, user_session_id: userSessionId })
    .execute();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.harmonica.chat';
  return `${baseUrl}/transcript/${token}?access=public`;
}

export async function sendTranscriptEmail(
  userSessionId: string,
  recipientEmail: string,
  sessionTopic: string
): Promise<{ success: boolean; url: string }> {
  const url = await generateShareToken(userSessionId);
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.harmonica.chat';

  // Mirrors the invitation email format from sendInvitation()
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0;">
        <img src="${appUrl}/harmonica.png" alt="Harmonica Logo" style="height: 40px;" />
      </div>
      <div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
        <h2>Your session transcript is ready</h2>
        <p>Hello,</p>
        <p>Your transcript from the <strong>${sessionTopic}</strong> session on Harmonica is now available to view.</p>
        <p>To view your transcript, click the button below. No account is required.</p>
        <p style="margin: 25px 0;">
          <a href="${url}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View transcript
          </a>
        </p>
        <p style="color: #666; font-size: 0.9em;">If you have any questions, please contact the session host.</p>
      </div>
      <div style="text-align: center; color: #666; font-size: 0.8em; margin-top: 20px;">
        <p>© ${new Date().getFullYear()} Harmonica. All rights reserved.</p>
      </div>
    </div>
  `;

  const success = await sendEmail({
    to: recipientEmail,
    subject: `Your transcript from the ${sessionTopic} session on Harmonica`,
    html,
  });

  return { success, url };
}
