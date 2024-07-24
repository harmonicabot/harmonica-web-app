import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import outputs from "@/amplify_outputs.json"

Amplify.configure(outputs);

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

export async function middleware(request: NextRequest) {
  // const user = await getCurrentUser();
  // const session = await fetchAuthSession();
  
  const token = request.cookies.get('token')?.value;

  if (request.nextUrl.pathname.startsWith('/session/create')) {
    if (token) {
      try {
        const decoded = verify(token, SECRET_KEY);
        if (decoded.isAdmin) {
          return NextResponse.next();
        }
      } catch (error) {
        // Invalid token
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
