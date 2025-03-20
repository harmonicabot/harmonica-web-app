import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('prompts')
    .renameColumn('description', 'instructions')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('prompts')
    .renameColumn('instructions', 'description')
    .execute();
}
