import { deleteSessionById } from "@/lib/db";

export async function deleteSession(id: string) {
  if (
    confirm(
      `Are you sure you want to delete this session and all associated data? \n\n${id}` // Todo: get the session topic instead of just id?
    )
  ) {
    return await deleteSessionById(id);
  }
  return false;
}