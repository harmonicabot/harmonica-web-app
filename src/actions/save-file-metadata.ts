'use server';

import { insertFileMetadata } from '@/lib/db';
import { analyzeFileContent } from '@/lib/monica/fileAnalysis';

export async function saveFileMetadata(data: {
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  filePurpose?: 'TRANSCRIPT' | 'KNOWLEDGE';
  fileContent?: string;
}) {
  try {
    let metadata: Record<string, any> = {};
    
    // Only analyze content for transcript files
    if (data.filePurpose === 'TRANSCRIPT' && data.fileContent) {
      metadata = await analyzeFileContent(data.fileContent);
    }

    const result = await insertFileMetadata({
      session_id: data.sessionId,
      file_name: data.fileName,
      file_type: data.fileType,
      file_size: data.fileSize,
      file_url: data.fileUrl,
      uploaded_by: data.uploadedBy,
      file_purpose: data.filePurpose,
      metadata: metadata as unknown as JSON,
    });
    return result;
  } catch (error) {
    console.error('Error saving file metadata:', error);
    throw error;
  }
}
