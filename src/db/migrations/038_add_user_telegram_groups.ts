import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user_telegram_groups')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('group_id', 'text', (col) => col.notNull())
    .addColumn('group_name', 'text')
    .addColumn('topic_id', 'integer')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addUniqueConstraint('uq_user_telegram_group', ['user_id', 'group_id'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_telegram_groups').execute();
}
