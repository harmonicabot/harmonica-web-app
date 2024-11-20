import { createKysely } from '@vercel/postgres-kysely';
import {
  Generated,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
  RawBuilder,
  PostgresDialect,
} from 'kysely';
import { sql, Kysely } from 'kysely';
import pg from 'pg';

export interface HostSessionsTable {
  id: Generated<string>;
  active: boolean;
  num_sessions: ColumnType<number, number, number | RawBuilder<unknown>>;
  num_finished: ColumnType<number, number, number | RawBuilder<unknown>>;
  prompt: string;
  template: string;
  topic: string;
  final_report_sent: boolean;
  context?: string;
  client?: string;
  summary?: string;
  start_time: ColumnType<Date, Date | undefined, never>;
  last_edit: Generated<Date>;
}

export interface UserSessionsTable {
  id: Generated<string>;
  session_id: string;
  user_id: string;
  thread_id: string;
  active: boolean;
  user_name?: string;
  feedback?: string;
  summary?: string; // Todo: Do we ever set this? (I think this is always only part of the chat text, isn't it?)
  step?: ColumnType<number, number, number | RawBuilder<unknown>>;
  start_time: ColumnType<Date, Date | undefined, never>;
  last_edit: Generated<Date>;
}

export interface MessagesTable {
  id: Generated<string>;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Generated<Date>;
}

// Database names:
export interface Databases {
  host_data: HostSessionsTable;
  user_data: UserSessionsTable;
  messages: MessagesTable;
}

export type HostSession = Selectable<HostSessionsTable>;
export type NewHostSession = Insertable<HostSessionsTable>;
export type HostSessionUpdate = Updateable<HostSessionsTable>;
export type UserSession = Selectable<UserSessionsTable>;
export type NewUserSession = Insertable<UserSessionsTable>;
export type UserSessionUpdate = Updateable<UserSessionsTable>;
export type Message = Selectable<MessagesTable>;
export type NewMessage = Insertable<MessagesTable>;

// Triggers & Setup helpers:

// ***** TRIGGER running on pg to update the last_edit on summary changes: *****
export function createTriggerOnHostUpdateLastEditSummary(
  databaseName: string = 'host_data'
) {
  sql`CREATE OR REPLACE FUNCTION update_last_edit_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.summary IS DISTINCT FROM OLD.summary THEN
        NEW.last_edit = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_edit_on_summary_change
    BEFORE UPDATE ON ${databaseName}
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edit_summary();
`;
}

// ***** TRIGGER running on pg to update the last_edit on chat_text change: *****
export function createTriggerOnUserUpdateLastEditChatText(
  databaseName: string = 'user_data'
) {
  sql`CREATE OR REPLACE FUNCTION update_last_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.chat_text IS DISTINCT FROM OLD.chat_text THEN
        NEW.last_edit = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_edit_on_chat_change
    BEFORE UPDATE ON ${databaseName}
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edit();
`;
}

export async function createHostTable(
  db: Kysely<any>,
  tableName: string = 'temp_host_db'
) {
  await db.schema
    .createTable(tableName)
    .ifNotExists()
    .addColumn('id', 'text', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`'hst_' || substr(md5(random()::text), 1, 12)`)
    )
    .addColumn('active', 'boolean', (col) => col.notNull())
    .addColumn('num_sessions', 'integer', (col) => col.notNull())
    .addColumn('num_finished', 'integer', (col) => col.notNull())
    .addColumn('prompt', 'text', (col) => col.notNull())
    .addColumn('template', 'text', (col) => col.notNull())
    .addColumn('topic', 'text', (col) => col.notNull())
    .addColumn('context', 'text')
    .addColumn('client', 'text')
    .addColumn('summary', 'text')
    .addColumn('final_report_sent', 'boolean', (col) => col.defaultTo(false))
    .addColumn('start_time', 'timestamp')
    .addColumn('last_edit', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function createUserTable(
  db: Kysely<any>,
  tableName: string = 'temp_user_db'
) {
  await db.schema
    .createTable(tableName)
    .addColumn('id', 'text', (col) =>
      col.primaryKey().defaultTo(sql`substr(md5(random()::text), 1, 12)`)
    )
    .addColumn('session_id', 'text', (col) => col.notNull())
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('active', 'boolean', (col) => col.notNull())
    .addColumn('thread_id', 'text', (col) => col.notNull().unique())
    .addColumn('user_name', 'text')
    .addColumn('feedback', 'text')
    .addColumn('summary', 'text')
    .addColumn('start_time', 'timestamp')
    .addColumn('step', 'numeric', (col) => col.defaultTo(0))
    .addColumn('last_edit', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export async function createMessagesTable(
  db: Kysely<any>,
  tableName: string = 'temp_message_db',
  userDbTableName: string = 'temp_user_db'
) {
  await db.schema
    .createTable(tableName)
    .addColumn('id', 'text', (col) =>
      col
        .primaryKey()
        .defaultTo(sql`'msg_' || substr(md5(random()::text), 1, 12)`)
    )
    .addColumn('thread_id', 'text', (col) =>
      col.notNull().references(`${userDbTableName}.thread_id`)
    )
    .addColumn('role', 'text', (col) =>
      col.notNull().check(sql`role IN ('user', 'assistant')`)
    )
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
}

export function createProdDbInstance() {
  const userDbName = 'user_db';
  const hostDbName = 'host_db';
  const messageDbName = 'message_db';
  interface Databases {
    [hostDbName]: HostSessionsTable;
    [userDbName]: UserSessionsTable;
    [messageDbName]: MessagesTable;
  }
  const db = createKysely<Databases>();
  return db;
}

export function createCustomDbInstance<T extends Record<string, any> = Databases>(
  host = 'temp_host_db',
  user = 'temp_user_db',
  message = 'temp_message_db',
  connectionUrl = process.env.CUSTOM_DATABASE
) {
  // type Databases = {
  //   [K in typeof host]: HostSessionsTable;
  // } & {
  //   [K in typeof user]: UserSessionsTable;
  // } & {
  //   [K in typeof message]: MessagesTable;
  // };

  const dialect = new PostgresDialect({
    pool: new pg.Pool({
      connectionString: connectionUrl,
      max: 10,
    }),
  });
  const db = new Kysely<T>({ dialect });
  return { db, dbNames: { host, user, message } };
}
