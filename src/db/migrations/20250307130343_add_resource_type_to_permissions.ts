import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable('permissions')
    .addColumn('resource_type', 'text', (col) => 
      col.notNull().defaultTo('SESSION')
    )
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema
    .alterTable('permissions')
    .dropColumn('resource_type')
    .execute();
}

