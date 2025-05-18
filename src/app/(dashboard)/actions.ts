import * as db from "@/lib/db";

export async function deleteSession(id: string) {
  if (
    confirm(
      `Are you sure you want to delete this session and all associated data? \n\n${id}` // Todo: get the session topic instead of just id?
    )
  ) {
    return await db.deleteSessionById(id);
  }
  return false;
}

export async function deleteWorkspace(id: string) {
  if (
    confirm(
      `Are you sure you want to delete this workspace? \n\n${id}`
    )
  ) {
    return await db.deleteWorkspace(id);
  }
  return false;
}