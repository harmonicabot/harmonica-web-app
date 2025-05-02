import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('daily_usage')
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('question_count', 'integer', (col) => col.notNull().defaultTo(0))
    .addPrimaryKeyConstraint('daily_usage_pk', ['user_id', 'date'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('daily_usage').execute();
}
