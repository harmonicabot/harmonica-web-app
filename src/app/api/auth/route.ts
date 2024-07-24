import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_USERS = ['admin@example.com']; // Whitelist of admin users

export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Simple check - replace with actual authentication logic
  if (password === 'admin-password' && ADMIN_USERS.includes(email)) {
    const token = sign({ email, isAdmin: true }, SECRET_KEY, { expiresIn: '1h' });
    return NextResponse.json({ token });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
