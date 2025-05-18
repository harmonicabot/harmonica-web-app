import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Fix the default values for created_at and last_modified columns in workspaces table
  // which was missing the 'sql' tag. now using dynamic SQL functions instead of static strings.
  // Note: Originally this used 'now()' instead of 'CURRENT_TIMESTAMP', but they're basically equivalent.

  await db.schema
    .alterTable('workspaces')
    .alterColumn('created_at', (col) => 
      col.setDefault(sql`CURRENT_TIMESTAMP`)
    )
    .alterColumn('last_modified', (col) => 
      col.setDefault(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log(`Nothing to revert here; this was a bugfix migration 
and reverting would unnecessarily reintroduce a stupid timestamp bug`);
}
