import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('workspaces')
    .addColumn('summary', 'text')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.alterTable('workspaces').dropColumn('summary').execute();
}
