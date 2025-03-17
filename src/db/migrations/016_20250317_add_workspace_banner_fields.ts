import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add banner styling columns to workspaces table
  await db.schema
    .alterTable('workspaces')
    .addColumn('bannerImage', 'text')
    .addColumn('gradientFrom', 'text')
    .addColumn('gradientTo', 'text')
    .addColumn('useGradient', 'boolean')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('workspaces')
    .dropColumn('bannerImage')
    .dropColumn('gradientFrom')
    .dropColumn('gradientTo')
    .dropColumn('useGradient')
    .execute();
}