import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import { db } from '@vercel/postgres';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limitationType = searchParams.get('type');

    if (!limitationType) {
      return NextResponse.json(
        { error: 'Limitation type required' },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const client = await db.connect();

    const usageResult = await client.query(
      'SELECT count FROM usage_tracking WHERE user_id = $1 AND limitation_type = $2 AND date = $3',
      [session.user.sub, limitationType, today],
    );
    const usage = usageResult.rows[0];

    const limitResult = await client.query(
      'SELECT max_count FROM usage_limits WHERE limitation_type = $1 AND subscription_tier = $2 AND is_active = $3',
      [limitationType, 'FREE', true],
    );
    const limit = limitResult.rows[0];

    return NextResponse.json({
      count: usage?.count || 0,
      limit: limit?.max_count || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await req.json();
    if (!type) {
      return NextResponse.json(
        { error: 'Limitation type required' },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT count FROM usage_tracking WHERE user_id = $1 AND limitation_type = $2 AND date = $3',
        [session.user.sub, type, today],
      );

      if (existing.rows[0]) {
        await client.query(
          'UPDATE usage_tracking SET count = count + 1 WHERE user_id = $1 AND limitation_type = $2 AND date = $3',
          [session.user.sub, type, today],
        );
      } else {
        await client.query(
          'INSERT INTO usage_tracking (user_id, limitation_type, date, count) VALUES ($1, $2, $3, $4)',
          [session.user.sub, type, today, 1],
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
