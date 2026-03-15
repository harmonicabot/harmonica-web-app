import { NextResponse } from 'next/server';
import { getCrossPollinationDebugState } from '../../../llamaUtils';

/**
 * GET /api/admin/scratchpad/[sessionId]
 *
 * Debug endpoint for inspecting cross-pollination state (scratchpad + clusters).
 * Returns in-memory cache state for the given session.
 *
 * Note: Caches are per-serverless-instance. If the session was handled by a
 * different instance, this will return null for both scratchpad and clusters.
 */
export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { sessionId } = params;
    const state = await getCrossPollinationDebugState(sessionId);

    return NextResponse.json({
      ...state,
      _meta: {
        note: 'In-memory cache state — only shows data from this serverless instance',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[x] Failed to fetch scratchpad state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scratchpad state' },
      { status: 500 },
    );
  }
}
