import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../_lib/auth';
import { internalError, validationError } from '../_lib/errors';
import { toSessionListItem } from '../_lib/mappers';
import {
  getResourcesForUser,
  listSessionsForUser,
  insertHostSessions,
  setPermission,
  getHostSessionById,
} from '@/lib/db';
import type { SessionStatus, CreateSessionRequest } from '@/lib/api-types';
import type { NewHostSession } from '@/lib/schema';
import { DEFAULT_PROMPTS } from '@/lib/defaultPrompts';

export async function GET(req: NextRequest) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') as SessionStatus | null;
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const permissions = await getResourcesForUser(user.id, 'SESSION');
    const sessionIds = permissions.map((p) => p.resource_id);

    const { sessions, total } = await listSessionsForUser(sessionIds, {
      status: status || undefined,
      search: q,
      limit,
      offset,
    });

    return NextResponse.json({
      data: sessions.map(toSessionListItem),
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('Error in GET /api/v1/sessions:', error);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const body = (await req.json()) as CreateSessionRequest;

    if (!body.topic?.trim()) return validationError('topic is required');
    if (!body.goal?.trim()) return validationError('goal is required');

    const prompt =
      body.prompt?.trim() || DEFAULT_PROMPTS.BASIC_FACILITATION_PROMPT;
    const promptSummary = body.prompt
      ? body.prompt.substring(0, 500)
      : body.goal;

    const newSession: NewHostSession = {
      topic: body.topic.trim(),
      goal: body.goal.trim(),
      prompt,
      prompt_summary: promptSummary,
      critical: body.critical?.trim() || undefined,
      context: body.context?.trim() || undefined,
      template_id: body.template_id || undefined,
      questions: body.questions
        ? (JSON.stringify(body.questions) as unknown as JSON)
        : undefined,
      assistant_id: '',
      summary_assistant_id: '',
      active: true,
      num_sessions: 0,
      num_finished: 0,
      final_report_sent: false,
      start_time: new Date(),
      cross_pollination: body.cross_pollination ?? false,
    };

    const [sessionId] = await insertHostSessions(newSession);

    // Explicit permission — insertHostSessions uses authGetSession() which
    // returns null under API key auth, so the owner permission is skipped.
    await setPermission(sessionId, 'owner', 'SESSION', user.id);

    const session = await getHostSessionById(sessionId);
    const baseUrl =
      process.env.AUTH0_BASE_URL || 'https://app.harmonica.chat';

    return NextResponse.json(
      {
        ...toSessionListItem(session),
        join_url: `${baseUrl}/chat?s=${sessionId}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in POST /api/v1/sessions:', error);
    return internalError();
  }
}
