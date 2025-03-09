'use server';
import * as db from './db';
import { UserProfile } from '@auth0/nextjs-auth0/client';
import { generateMultiSessionSummary } from './summaryMultiSession';

export async function isAdmin(user: UserProfile) {
  console.log('Admin IDs: ', process.env.ADMIN_ID);
  return (process.env.ADMIN_ID || '').indexOf(user.sub ?? 'NO USER') > -1;
}

// Create a summary for a single session
export async function createSummary(sessionId: string) {
  const summary = await generateMultiSessionSummary([sessionId]);

  await db.updateHostSession(sessionId, {
    summary: summary.toString(),
    last_edit: new Date(),
  });
  return summary;
}

// Create a summary for multiple sessions
export async function createMultiSessionSummary(
  sessionIds: string[],
  workspaceId: string,
) {
  const summary = await generateMultiSessionSummary(sessionIds);

  await db.updateWorkspace(workspaceId, {
    summary: summary.toString(),
    last_modified: new Date(),
  });
  return summary;
}
