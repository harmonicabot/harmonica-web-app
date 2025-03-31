import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('custom_responses')
    .addColumn('response_type', 'text', (col) => col.defaultTo("CUSTOM"))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('custom_responses').dropColumn('response_type').execute();
}
