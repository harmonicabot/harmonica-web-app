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
  getUserSessionByUserAndSession,
  insertUserSessions,
  insertChatMessage,
  updateUserSession,
  increaseSessionsCount,
} from '@/lib/db';
import * as llama from '../../../../llamaUtils';
import type { ChatRequest, ChatResponse } from '@/lib/api-types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const { id } = await params;

  try {
    const role = await checkSessionAccess(user, id, 'editor');
    if (!role) return forbidden('You need editor access to this session');

    const body = (await req.json()) as ChatRequest;
    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return validationError('content is required and must be a non-empty string');
    }
    if (body.content.length > 10000) {
      return validationError('content must be 10000 characters or less');
    }
    if (!body.participant_id || typeof body.participant_id !== 'string') {
      return validationError('participant_id is required');
    }
    if (!body.participant_name || typeof body.participant_name !== 'string') {
      return validationError('participant_name is required');
    }

    const session = await getHostSessionById(id);
    if (!session.active) {
      return validationError('Session is not active');
    }

    const existingSession = await getUserSessionByUserAndSession(id, body.participant_id);
    let isNewParticipant = false;
    let threadId: string;
    let userSessionId: string;

    if (existingSession) {
      threadId = existingSession.thread_id;
      userSessionId = existingSession.id;
    } else {
      isNewParticipant = true;
      threadId = crypto.randomUUID();
      const [newId] = await insertUserSessions({
        session_id: id,
        user_id: body.participant_id,
        user_name: body.participant_name,
        thread_id: threadId,
        active: true,
        start_time: new Date(),
        last_edit: new Date(),
      });
      userSessionId = newId;
    }

    // Store user message
    await insertChatMessage({
      thread_id: threadId,
      role: 'user',
      content: body.content.trim(),
      created_at: new Date(),
    });

    // Call facilitation handler
    const answer = await llama.handleGenerateAnswer(
      {
        threadId,
        messageText: body.content.trim(),
        sessionId: id,
      },
      session.cross_pollination,
    );

    // Store assistant response
    await insertChatMessage({
      thread_id: threadId,
      role: 'assistant',
      content: answer.content,
      created_at: new Date(),
      is_final: answer.is_final,
    });

    await updateUserSession(userSessionId, { last_edit: new Date() });

    if (isNewParticipant) {
      await increaseSessionsCount(id, 'num_sessions');
    }

    if (answer.is_final) {
      await increaseSessionsCount(id, 'num_finished');
      await updateUserSession(userSessionId, { active: false });
    }

    const response: ChatResponse = {
      message: {
        role: 'assistant',
        content: answer.content,
        is_final: answer.is_final || false,
      },
      thread_id: threadId,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in POST /api/v1/sessions/[id]/chat:', error);
    return internalError();
  }
}
