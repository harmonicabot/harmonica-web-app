'use server';

import { put } from '@vercel/blob';

export async function uploadFile(formData: FormData) {
  console.log('Uploading file...');

  // Get necessary data
  const file = formData.get('file') as File;
  const sessionId = formData.get('sessionId') as string;

  if (!sessionId || !file) {
    throw new Error('Missing required fields');
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'text/plain', 'application/json'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PDF, TXT, and JSON files are allowed');
  }

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large (max 10MB)');
  }

  // Create a secure filename
  const fileExtension = file.name.split('.').pop();
  const secureFilename = `session_${sessionId}_file_${Date.now()}.${fileExtension}`;

  // Upload to Vercel Blob
  const blob = await put(secureFilename, file, {
    access: 'public',
  });

  return {
    url: blob.url,
    filename: file.name,
    size: file.size,
    type: file.type,
  };
}
