import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema.alterTable('user_db').addColumn('language', 'text').execute();

}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('user_db').dropColumn('language').execute();
}
