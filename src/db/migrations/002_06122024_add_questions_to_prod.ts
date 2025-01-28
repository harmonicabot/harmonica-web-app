import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('prod_host_db')
    .addColumn('questions', 'json')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('prod_host_db')
    .dropColumn('questions')
    .execute();
} 