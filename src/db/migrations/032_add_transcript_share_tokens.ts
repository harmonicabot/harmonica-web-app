import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('transcript_share_tokens')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('token', 'varchar(21)', (col) =>
      col.notNull().unique())
    .addColumn('user_session_id', 'uuid', (col) =>
      col.notNull().references('user_sessions.id').onDelete('cascade'))
    .execute();

  await db.schema
    .createIndex('idx_transcript_share_tokens_token')
    .on('transcript_share_tokens')
    .column('token')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('transcript_share_tokens').execute();
}
