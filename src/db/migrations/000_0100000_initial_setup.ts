import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // Create the base host_db table (host_sessions)
  await db.schema
    .createTable('host_db')
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('active', 'boolean', (col) => col.notNull())
    .addColumn('num_sessions', 'integer', (col) => col.notNull())
    .addColumn('num_finished', 'integer', (col) => col.notNull())
    .addColumn('prompt', 'text', (col) => col.notNull())
    .addColumn('template', 'text', (col) => col.notNull())
    .addColumn('topic', 'text', (col) => col.notNull())
    .addColumn('context', 'text', (col) => col.notNull())
    .addColumn('final_report_sent', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('summary', 'text')
    .addColumn('start_time', 'timestamp', (col) => col.notNull())
    .addColumn('last_edit', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Create the base user_db table
  await db.schema
    .createTable('user_db')
    .addColumn('id', 'text', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('session_id', 'text', (col) => col.notNull())
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('thread_id', 'text', (col) => col.notNull())
    .addColumn('active', 'boolean', (col) => col.notNull())
    .addColumn('user_name', 'text')
    .addColumn('feedback', 'text')
    .addColumn('summary', 'text')
    .addColumn('start_time', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('last_edit', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Create the base messages table
  await db.schema
    .createTable('messages_db')
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('thread_id', 'text', (col) => col.notNull())
    .addColumn('role', 'text', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Add indexes for common queries
  await db.schema
    .createIndex('host_db_active_idx')
    .on('host_db')
    .column('active')
    .execute();

  await db.schema
    .createIndex('user_db_session_id_idx')
    .on('user_db')
    .column('session_id')
    .execute();

  await db.schema
    .createIndex('messages_db_thread_id_idx')
    .on('messages_db')
    .column('thread_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropIndex('messages_db_thread_id_idx').execute();
  await db.schema.dropIndex('user_db_session_id_idx').execute();
  await db.schema.dropIndex('host_db_active_idx').execute();
  await db.schema.dropTable('messages_db').execute();
  await db.schema.dropTable('user_db').execute();
  await db.schema.dropTable('host_db').execute();
}