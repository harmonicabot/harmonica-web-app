import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { isbot } from 'isbot';

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const isAbot = isbot(req.headers.get('User-Agent'));
  if (isAbot && !req.nextUrl.pathname.startsWith('/api')) {
    const botUrl = new URL('/bots', req.nextUrl);
    botUrl.searchParams.set('pathAndSearch', req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.rewrite(botUrl);
  }

  if (
    // Allow these without authentication:
    req.nextUrl.pathname.match(
      /^\/(?:api|login|chat|favicon\.ico|h_chat_icon\.png|.*opengraph-image\.png|.*og_.*\.png|_next\/static|_next\/image)/
    )
  ) {
    return NextResponse.next();
  }

  const authRequiredMiddleware = withMiddlewareAuthRequired();
  return authRequiredMiddleware(req, ev);
}