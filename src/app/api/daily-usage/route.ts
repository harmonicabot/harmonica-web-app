import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import { db } from '@vercel/postgres';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const client = await db.connect();

    const result = await client.query(
      'SELECT question_count FROM daily_usage WHERE user_id = $1 AND date = $2',
      [session.user.sub, today],
    );

    return NextResponse.json({ count: result.rows[0]?.question_count || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT question_count FROM daily_usage WHERE user_id = $1 AND date = $2',
        [session.user.sub, today],
      );

      if (existing.rows[0]) {
        await client.query(
          'UPDATE daily_usage SET question_count = question_count + 1 WHERE user_id = $1 AND date = $2',
          [session.user.sub, today],
        );
      } else {
        await client.query(
          'INSERT INTO daily_usage (user_id, date, question_count) VALUES ($1, $2, $3)',
          [session.user.sub, today, 1],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
