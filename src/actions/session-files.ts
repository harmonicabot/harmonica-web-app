'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Fetches all files associated with a specific session
 */
export async function getSessionFiles(sessionId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${sessionId}/files`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cookies().get('token')?.value}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch session files:', error);
    throw error;
  }
}

/**
 * Deletes a specific file from a session
 */
export async function deleteSessionFile(fileId: number, fileUrl: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cookies().get('token')?.value}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    // Revalidate the session files path to refresh the data
    revalidatePath('/sessions/[id]', 'page');

    return await response.json();
  } catch (error) {
    console.error('Failed to delete session file:', error);
    throw error;
  }
}
