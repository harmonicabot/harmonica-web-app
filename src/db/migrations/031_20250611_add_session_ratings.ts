import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create the session_ratings table
  await db.schema
    .createTable('session_ratings')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('thread_id', 'text', (col) => col.notNull())
    .addColumn('rating', 'smallint', (col) =>
      col.notNull().check(sql`rating >= 1 AND rating <= 5`),
    )
    .addColumn('feedback', 'text')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('user_id', 'text')
    .execute();

  // Add indexes
  await db.schema
    .createIndex('session_ratings_thread_id_idx')
    .on('session_ratings')
    .column('thread_id')
    .execute();

  await db.schema
    .createIndex('session_ratings_created_at_idx')
    .on('session_ratings')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('session_ratings').execute();
}
