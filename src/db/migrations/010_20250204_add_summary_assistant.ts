import { Kysely } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('workspaces')
    .addColumn('summary_assistant_id', 'text', (col) => col.defaultTo(process.env.SUMMARY_ASSISTANT))
    .execute()

  await db.schema
    .alterTable('host_db')
    .addColumn('summary_assistant_id', 'text', (col) => col.defaultTo(process.env.SUMMARY_ASSISTANT))
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('workspaces')
    .dropColumn('summary_assistant_id')
    .execute()

  await db.schema
    .alterTable('host_db')
    .dropColumn('summary_assistant_id')
    .execute()
}
