import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { isbot } from 'isbot';

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const isAbot = isbot(req.headers.get('User-Agent'));
  if (isAbot && !req.nextUrl.pathname.startsWith('/api')) {
    const botUrl = new URL('/bots', req.nextUrl);
    const path = req.nextUrl.pathname;

    if (path.startsWith('/chat')) {
      botUrl.pathname = '/bots/chat';
    } else {
      botUrl.pathname = '/bots/';
    }

    botUrl.searchParams.set('pathAndSearch', path + req.nextUrl.search);
    return NextResponse.rewrite(botUrl);
  }

  if (
    // Allow these without authentication:
    req.nextUrl.pathname.match(
      /^\/(?:api|login|chat|.*\.ico|.*\.png|.*\.svg|_next\/static|_next\/image)/
    )
  ) {
    return NextResponse.next();
  }

  // Check public access parameter
  const isPublicAccess = req.nextUrl.searchParams.get('access') === 'public';
  if (isPublicAccess) {
    return NextResponse.next();
  }

  const authRequiredMiddleware = withMiddlewareAuthRequired();
  return authRequiredMiddleware(req, ev);
}