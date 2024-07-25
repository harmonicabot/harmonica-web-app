import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const basicAuth = request.headers.get('authorization')

  type Users = Map<string, { password: string, role: string }>

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')
    const authUsers: Users = new Map(
      Object.entries(JSON.parse(process.env.AUTH_USERS || '{}'))
    )

    console.log(`Trying to log in with ${user.slice(0, 2)}${'*'.repeat(user.length - 2)}:${pwd.slice(0, 2)}${'*'.repeat(pwd.length - 2)}`)
    if (authUsers.get(user) && authUsers.get(user).password === pwd) {
      const userRole = authUsers.get(user).role;
      if (request.nextUrl.pathname === '/create' && (userRole === 'admin' || userRole === 'host')) {
        return NextResponse.next();
      } else if (request.nextUrl.pathname === '/sessions' && userRole === 'admin') {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="Secure Area", charset="UTF-8"`,
    },
  })
}

export const config = {
  matcher: ['/create', '/sessions'],
}