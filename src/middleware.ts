import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { isbot } from 'isbot';

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const isAbot = isbot(req.headers.get('User-Agent'));
  console.log('Identified as bot: ', isAbot);

  if (isAbot && !req.nextUrl.pathname.startsWith('/api')) {
    console.log('Detected bot!');
    const redirectUrl = NextResponse.rewrite(new URL('/api/metadata', req.url));
    return redirectUrl;
  }

  if (
    req.nextUrl.pathname.match(
      /^\/(?:api|login|chat|favicon\.ico|h_chat_icon\.png|opengraph-image\.png|_next\/static|_next\/image)/
    )
  ) {
    // Allow these without authentication:
    return NextResponse.next();
  }

  const authRequiredMiddleware = withMiddlewareAuthRequired();
  return authRequiredMiddleware(req, ev);
}