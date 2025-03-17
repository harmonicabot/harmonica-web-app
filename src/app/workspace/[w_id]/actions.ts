'use server';

import * as db from '@/lib/db';
import { Workspace } from '@/lib/schema';

export async function createNewWorkspace(workspaceData: Workspace) {
  return await db.createWorkspace({
    ...workspaceData
  });
}
