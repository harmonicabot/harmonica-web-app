import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('messages_db')
    .addColumn('is_final', 'boolean', (col) => col.defaultTo(false))
    .execute();

  await sql`
    COMMENT ON COLUMN messages_db.is_final IS 'Indicates if this message is the final message in a conversation';
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('messages_db').dropColumn('is_final').execute();
}
