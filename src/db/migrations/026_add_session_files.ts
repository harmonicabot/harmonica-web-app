import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('session_files')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('session_id', 'text', (col) => col.notNull())
    .addColumn('file_name', 'text', (col) => col.notNull())
    .addColumn('file_type', 'text', (col) => col.notNull())
    .addColumn('file_size', 'integer', (col) => col.notNull())
    .addColumn('file_url', 'text', (col) => col.notNull())
    .addColumn('uploaded_by', 'text', (col) => col.notNull())
    .addColumn('uploaded_at', 'timestamp', (col) =>
      col.defaultTo(sql.raw('NOW()')).notNull(),
    )
    .addColumn('is_deleted', 'boolean', (col) => col.defaultTo(false).notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('session_files').execute();
}
