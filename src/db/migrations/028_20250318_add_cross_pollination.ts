import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('host_db')
    .addColumn('cross_pollination', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('host_db')
    .dropColumn('cross_pollination')
    .execute();
}
