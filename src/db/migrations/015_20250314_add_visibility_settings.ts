import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Add visibility_settings to host_db table
  await db.schema
    .alterTable('host_db')
    .addColumn('visibility_settings', 'jsonb', (col) => col.defaultTo(null))
    .execute();

  // Add visibility_settings & location to workspaces table
  await db.schema
    .alterTable('workspaces')
    .addColumn('location', 'text')
    .addColumn('visibility_settings', 'jsonb', (col) => col.defaultTo(null))
    .execute();
}

export async function down(db: Kysely<any>) {
  // Remove visibility_settings from host_db table
  await db.schema
    .alterTable('host_db')
    .dropColumn('visibility_settings')
    .execute();

  // Remove visibility_settings from workspaces table
  await db.schema
    .alterTable('workspaces')
    .dropColumn('location')
    .dropColumn('visibility_settings')
    .execute();
}
