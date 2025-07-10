import * as db from '@/lib/db';

export async function deleteSession(id: string) {
  return await db.deleteSessionById(id);
}

export async function deleteWorkspace(id: string) {
  return await db.deleteWorkspace(id);
}