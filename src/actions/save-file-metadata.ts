'use server';

import * as db from '@/lib/db';

export async function saveFileMetadata({
  sessionId,
  fileName,
  fileType,
  fileSize,
  fileUrl,
  uploadedBy,
}: {
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
}) {
  try {
    const result = await db.insertFileMetadata({
      session_id: sessionId,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      file_url: fileUrl,
      uploaded_by: uploadedBy,
    });

    return { success: true, fileId: result?.id };
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw new Error('Failed to save file metadata');
  }
}
