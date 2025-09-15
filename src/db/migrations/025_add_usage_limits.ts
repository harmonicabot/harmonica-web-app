import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create limitation type enum
  await sql`CREATE TYPE limitation_type AS ENUM (
    'ASK_AI_QUESTIONS',
    'PARTICIPANT_SUMMARIES',
    'CHAT_MESSAGES',
    'CUSTOM_PROMPTS'
  )`.execute(db);

  // Create subscription type enum if not exists
  await sql`DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
      END IF;
    END $$;`.execute(db);

  // Create limitations configuration table
  await db.schema
    .createTable('usage_limits')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('limitation_type', sql`limitation_type`, (col) => col.notNull())
    .addColumn('subscription_tier', sql`subscription_tier`, (col) =>
      col.notNull(),
    )
    .addColumn('max_count', 'integer', (col) => col.notNull())
    .addColumn('time_period', 'text', (col) => col.notNull()) // 'daily', 'monthly', etc.
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();

  // Create usage tracking table
  await db.schema
    .createTable('usage_tracking')
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('limitation_type', sql`limitation_type`, (col) => col.notNull())
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('count', 'integer', (col) => col.notNull().defaultTo(0))
    .addPrimaryKeyConstraint('usage_tracking_pk', [
      'user_id',
      'limitation_type',
      'date',
    ])
    .execute();

  // Insert default limitations
  await db
    .insertInto('usage_limits')
    .values([
      {
        limitation_type: 'ASK_AI_QUESTIONS',
        subscription_tier: 'FREE',
        max_count: 3,
        time_period: 'daily',
        description: 'Number of AI questions per day for free users',
        is_active: true,
      },
      {
        limitation_type: 'PARTICIPANT_SUMMARIES',
        subscription_tier: 'FREE',
        max_count: 5,
        time_period: 'daily',
        description: 'Number of participant summaries per day for free users',
        is_active: true,
      },
      // Pro tier with higher limits
      {
        limitation_type: 'ASK_AI_QUESTIONS',
        subscription_tier: 'PRO',
        max_count: 100,
        time_period: 'daily',
        description: 'Number of AI questions per day for pro users',
        is_active: true,
      },
      {
        limitation_type: 'PARTICIPANT_SUMMARIES',
        subscription_tier: 'PRO',
        max_count: 50,
        time_period: 'daily',
        description: 'Number of participant summaries per day for pro users',
        is_active: true,
      },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('usage_tracking').execute();
  await db.schema.dropTable('usage_limits').execute();
  await sql`DROP TYPE IF EXISTS limitation_type`.execute(db);
}
