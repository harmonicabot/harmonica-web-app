export { auth as middleware } from '@/lib/auth';

// Don't invoke Middleware on some paths
export const config = {
  matcher: [
    // Exclude specific paths including sessions with any string after it
    '/((?!api|_next/static|_next/image|favicon.ico|login|chat|create|h_chat_icon.png).*)',
  ],
};
