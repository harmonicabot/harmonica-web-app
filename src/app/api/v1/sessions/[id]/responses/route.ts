import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../../_lib/auth';
import {
  forbidden,
  internalError,
  notFound,
  validationError,
} from '../../../_lib/errors';
import { checkSessionAccess } from '../../../_lib/permissions';
import {
  getHostSessionById,
  getUsersBySessionId,
  getUserSessionByUserAndSession,
  getAllMessagesForUsersSorted,
  insertUserSessions,
  insertChatMessage,
} from '@/lib/db';
import type { Participant, Message as ApiMessage } from '@/lib/api-types';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const { id } = await params;

  try {
    const role = await checkSessionAccess(user, id);
    if (!role) return forbidden();

    // Verify session exists
    await getHostSessionById(id);

    const userSessions = await getUsersBySessionId(id);
    const included = userSessions.filter((us) => us.include_in_summary);

    if (included.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const allMessages = await getAllMessagesForUsersSorted(included);

    // Group messages by thread_id
    const messagesByThread = new Map<string, ApiMessage[]>();
    for (const msg of allMessages) {
      const thread = messagesByThread.get(msg.thread_id) || [];
      thread.push({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at.toISOString(),
      });
      messagesByThread.set(msg.thread_id, thread);
    }

    const participants: Participant[] = included.map((us) => ({
      participant_id: us.id,
      participant_name: us.user_name || null,
      active: us.active,
      messages: messagesByThread.get(us.thread_id) || [],
    }));

    return NextResponse.json({ data: participants });
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in GET /api/v1/sessions/[id]/responses:', error);
    return internalError();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const { id } = await params;

  try {
    // Check editor access
    const role = await checkSessionAccess(user, id, 'editor');
    if (!role) return forbidden('You need editor access to submit responses');

    // Parse and validate body
    const body = await req.json();
    const content = body?.content;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return validationError('content is required and must be a non-empty string');
    }
    if (content.length > 10000) {
      return validationError('content must be 10000 characters or less');
    }

    // Check session is active
    const session = await getHostSessionById(id);
    if (!session.active) {
      return validationError('Session is not active');
    }

    // Find or create user session
    let userSession = await getUserSessionByUserAndSession(id, user.id);
    if (!userSession) {
      const threadId = crypto.randomUUID();
      const [userSessionId] = await insertUserSessions({
        session_id: id,
        user_id: user.id,
        thread_id: threadId,
        active: true,
        user_name: user.name || undefined,
      });
      userSession = {
        id: userSessionId,
        session_id: id,
        user_id: user.id,
        thread_id: threadId,
        active: true,
        include_in_summary: true,
        user_name: user.name || undefined,
        feedback: undefined,
        summary: undefined,
        language: undefined,
        start_time: new Date(),
        last_edit: new Date(),
      };
    }

    // Insert the message
    const messageId = crypto.randomUUID();
    await insertChatMessage({
      id: messageId,
      thread_id: userSession.thread_id,
      role: 'user',
      content: content.trim(),
    });

    return NextResponse.json(
      {
        id: messageId,
        session_id: id,
        content: content.trim(),
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in POST /api/v1/sessions/[id]/responses:', error);
    return internalError();
  }
}
