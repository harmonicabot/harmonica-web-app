import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|chat|h_chat_icon.png).*)',
  ],
};


export default withMiddlewareAuthRequired();