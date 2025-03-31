import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create users table
  await db.schema
    .createTable('users')
    .addColumn('id', 'varchar', (col) => col.primaryKey().notNull())
    .addColumn('email', 'varchar', (col) => col.notNull())
    .addColumn('name', 'varchar')
    .addColumn('avatar_url', 'varchar')
    .addColumn('last_login', 'timestamp', (col) => 
      col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('created_at', 'timestamp', (col) => 
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .addColumn('metadata', 'jsonb')
    .execute();

  // Create unique index on email
  await db.schema
    .createIndex('users_email_idx')
    .on('users')
    .column('email')
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute();
}