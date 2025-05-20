import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add summary_prompt column to host_sessions table
  await db.schema
    .alterTable('host_db')
    .addColumn('summary_prompt', 'text')
    .execute();

  // Add summary_prompt column to workspaces table
  await db.schema
    .alterTable('workspaces')
    .addColumn('summary_prompt', 'text')
    .execute();

  console.log('Migration completed: Added summary_prompt to host_sessions and workspaces tables');
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove summary_prompt column from host_sessions table
  await db.schema
    .alterTable('host_db')
    .dropColumn('summary_prompt')
    .execute();

  // Remove summary_prompt column from workspaces table
  await db.schema
    .alterTable('workspaces')
    .dropColumn('summary_prompt')
    .execute();

  console.log('Rollback completed: Removed summary_prompt from host_sessions and workspaces tables');
}