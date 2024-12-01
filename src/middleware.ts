import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextResponse, userAgent } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|chat|h_chat_icon.png|opengraph-image.png).*)',
  ],
};


export default withMiddlewareAuthRequired(async (req) => {
  const usrAgent = userAgent(req)
  
  if (usrAgent.isBot && !req.nextUrl.pathname.startsWith('/api')) {
    console.log('Detected bot: ', usrAgent)
    // Allow bots without authentication
    return NextResponse.rewrite(new URL('/api/metadata' + req.nextUrl.pathname, req.url))
  }
  return NextResponse.next()
});