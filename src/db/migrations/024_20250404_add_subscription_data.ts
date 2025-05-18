import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create subscription status enum
  await sql`CREATE TYPE subscription_tier AS ENUM (
    'FREE',
    'PRO',
    'ENTERPRISE'
  )`.execute(db);

  // Add subscription columns to users table
  await db.schema
    .alterTable('users')
    .addColumn('subscription_status', sql`subscription_tier`, (col) =>
      col.defaultTo('FREE').notNull(),
    )
    .addColumn('subscription_id', 'varchar') // Stripe subscription ID
    .addColumn('subscription_period_end', 'timestamp')
    .addColumn('stripe_customer_id', 'varchar')
    .execute();

  // Create index for faster subscription lookups
  await db.schema
    .createIndex('users_subscription_idx')
    .on('users')
    .columns(['subscription_status', 'subscription_period_end'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('users_subscription_idx').execute();

  await db.schema
    .alterTable('users')
    .dropColumn('subscription_status')
    .dropColumn('subscription_id')
    .dropColumn('subscription_period_end')
    .dropColumn('stripe_customer_id')
    .execute();

  await sql`DROP TYPE IF EXISTS subscription_tier`.execute(db);
}
