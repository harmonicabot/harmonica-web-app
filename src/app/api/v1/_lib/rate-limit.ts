import { NextResponse } from 'next/server';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiter = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limiter) {
    if (entry.resetAt <= now) {
      limiter.delete(key);
    }
  }
}, 5 * 60_000);

/**
 * Check rate limit for a given identifier (API key hash).
 * Returns a 429 Response if limit exceeded, or null if within limits.
 */
export function checkRateLimit(identifier: string): NextResponse | null {
  const now = Date.now();
  let entry = limiter.get(identifier);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    limiter.set(identifier, entry);
    return null;
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: { code: 'rate_limited', message: `Rate limit exceeded. Try again in ${retryAfter} seconds.` } },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  return null;
}
