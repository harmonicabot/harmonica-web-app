import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '../../_lib/rate-limit';
import { internalError } from '../../_lib/errors';
import { toPublicSessionListItem } from '../../_lib/mappers';
import { listPublicSessions } from '@/lib/db';

export async function GET(req: NextRequest) {
  // Rate limit by IP (no auth required for this endpoint)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitResponse = checkRateLimit(`public:${ip}`);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q') || undefined;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20'), 1),
      100,
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const { sessions, total } = await listPublicSessions({
      search: q,
      limit,
      offset,
    });

    const baseUrl = process.env.AUTH0_BASE_URL || 'https://app.harmonica.chat';

    return NextResponse.json({
      data: sessions.map((s) => toPublicSessionListItem(s, baseUrl)),
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('Error in GET /api/v1/sessions/public:', error);
    return internalError();
  }
}
