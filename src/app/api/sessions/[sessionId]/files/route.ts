import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFiles,
  insertFileMetadata,
  updateSessionFile,
} from '@/lib/db';

// GET: Fetch all files for a session
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const files = await getSessionFiles(params.sessionId);
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch session files' }, { status: 500 });
  }
}

// POST: Upload a new file to a session (expects JSON body with file metadata)
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await req.json();
    // Required fields: file_name, file_type, file_size, file_url, uploaded_by
    const { file_name, file_type, file_size, file_url, uploaded_by } = body;
    if (!file_name || !file_type || !file_size || !file_url || !uploaded_by) {
      return NextResponse.json({ error: 'Missing required file metadata' }, { status: 400 });
    }
    const result = await insertFileMetadata({
      session_id: params.sessionId,
      file_name,
      file_type,
      file_size,
      file_url,
      uploaded_by,
    });
    return NextResponse.json({ id: result?.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// DELETE: Mark a file as deleted (expects fileId in query string)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    const result = await updateSessionFile(Number(fileId), { is_deleted: true });
    return NextResponse.json({ id: result?.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
