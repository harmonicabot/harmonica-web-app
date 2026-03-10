import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('host_db')
    .addColumn('distribution', 'jsonb')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('host_db')
    .dropColumn('distribution')
    .execute();
}
