import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema.alterTable('user_db')
    .addColumn('include_in_summary', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('user_db').dropColumn('include_in_summary').execute();
}
