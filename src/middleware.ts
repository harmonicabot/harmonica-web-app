import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';
import { isbot } from 'isbot';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|chat|h_chat_icon.png|opengraph-image.png).*)',
  ],
};


export default withMiddlewareAuthRequired(async (req) => {
  const userAgent = req.headers.get('User-Agent');
  const isABot = isbot(userAgent);
  
  if (isABot) {
    console.log('Detected bot: ', userAgent)
    // Allow bots without authentication
    return NextResponse.next();
  }
});