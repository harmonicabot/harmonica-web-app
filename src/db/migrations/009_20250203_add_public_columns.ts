import { Kysely } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('workspaces')
    .addColumn('is_public', 'boolean', (col) => col.defaultTo(false))
    .execute()

  await db.schema
    .alterTable('host_db')
    .addColumn('is_public', 'boolean', (col) => col.defaultTo(false))
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('workspaces')
    .dropColumn('is_public')
    .execute()

  await db.schema
    .alterTable('host_db')
    .dropColumn('is_public')
    .execute()
}
