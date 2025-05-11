import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('session_files')
    .addColumn('metadata', 'jsonb')
    .addColumn('file_purpose', 'text', (col) => 
      col.check(sql`file_purpose IN ('TRANSCRIPT', 'KNOWLEDGE')`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('session_files')
    .dropColumn('metadata')
    .dropColumn('file_purpose')
    .execute();
} 