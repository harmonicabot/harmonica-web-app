import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('host_db')
    .addColumn('goal', 'text', (col) => col.notNull().defaultTo(''))
    .addColumn('critical', 'text')
    .addColumn('prompt_summary', 'text', (col) => col.notNull().defaultTo(''))
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('host_db')
    .dropColumn('goal')
    .dropColumn('critical')
    .dropColumn('prompt_summary')
    .execute();
}
