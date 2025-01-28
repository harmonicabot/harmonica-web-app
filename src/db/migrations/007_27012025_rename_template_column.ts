import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('host_db')
    .renameColumn('template', 'assistant_id')
    .execute();

  // For some reason rename & add column in the same query doesn't work, so split it up:
  await db.schema
    .alterTable('host_db')
    .addColumn('template_id', 'varchar')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('host_db')
    .dropColumn('template_id')
    .execute();

  await db.schema
    .alterTable('host_db')
    .renameColumn('assistant_id', 'template')
    .execute();
}
