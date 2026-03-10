import { NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../_lib/auth';
import {
  forbidden,
  internalError,
  notFound,
  validationError,
} from '../../../../_lib/errors';
import { checkSessionAccess } from '../../../../_lib/permissions';
import {
  getHostSessionById,
  getUserSessionByUserAndSession,
  insertUserSessions,
  insertChatMessage,
  increaseSessionsCount,
} from '@/lib/db';
import * as llama from '../../../../../llamaUtils';
import type { ChatQuestionsRequest, ChatResponse } from '@/lib/api-types';

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

    const body = (await req.json()) as ChatQuestionsRequest;
    if (!body.participant_id || typeof body.participant_id !== 'string') {
      return validationError('participant_id is required');
    }
    if (!body.participant_name || typeof body.participant_name !== 'string') {
      return validationError('participant_name is required');
    }
    if (!Array.isArray(body.answers)) {
      return validationError('answers must be an array');
    }

    const session = await getHostSessionById(id);
    if (!session.active) {
      return validationError('Session is not active');
    }

    // Idempotent: if participant already joined, return error
    const existing = await getUserSessionByUserAndSession(id, body.participant_id);
    if (existing) {
      return validationError('Participant already joined this session');
    }

    // Create thread
    const threadId = crypto.randomUUID();
    await insertUserSessions({
      session_id: id,
      user_id: body.participant_id,
      user_name: body.participant_name,
      thread_id: threadId,
      active: true,
      start_time: new Date(),
      last_edit: new Date(),
    });

    // Store question answers as initial context (mirrors web app useChat.ts createThread)
    const questions = session.questions ? JSON.parse(JSON.stringify(session.questions)) : [];
    const contextString = body.answers
      .map((a) => {
        const question = questions.find((q: any) => q.id === a.question_id);
        const label = question?.label || a.question_id;
        return `${label}: ${a.answer}`;
      })
      .join('; ');

    if (contextString) {
      await insertChatMessage({
        thread_id: threadId,
        role: 'user',
        content: `User shared the following context:\n${contextString}`,
        created_at: new Date(),
      });
    }

    // Store the "Let's begin" trigger message
    await insertChatMessage({
      thread_id: threadId,
      role: 'user',
      content: "Let's begin.",
      created_at: new Date(),
    });

    // Call facilitation handler for the opening message
    const answer = await llama.handleGenerateAnswer(
      {
        threadId: threadId,
        messageText: "Let's begin.",
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

    await increaseSessionsCount(id, 'num_sessions');

    const response: ChatResponse = {
      message: {
        role: 'assistant',
        content: answer.content,
        is_final: answer.is_final || false,
      },
      thread_id: threadId,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('no result')) {
      return notFound('Session not found');
    }
    console.error('Error in POST /api/v1/sessions/[id]/chat/questions:', error);
    return internalError();
  }
}
