import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('custom_responses')
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('session_id', 'text', (col) => 
      col.references('host_db.id').onDelete('cascade').notNull()
    )
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('position', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => 
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Add index for faster lookups by session_id
  await db.schema
    .createIndex('custom_responses_session_idx')
    .on('custom_responses')
    .column('session_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .dropTable('custom_responses')
    .execute();
}
