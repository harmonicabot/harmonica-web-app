import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add initialized column to workspaces table with default value of true for existing workspaces
  await db.schema
    .alterTable('workspaces')
    .addColumn('status', 'text', (col) => col.defaultTo('active'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('workspaces')
    .dropColumn('status')
    .execute();
}
