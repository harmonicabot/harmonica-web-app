import {
  Generated,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
  QueryExecutorProvider,
} from 'kysely';
import { sql, Kysely } from 'kysely';

export interface HostSessionsTable {
  id: Generated<string>;
  active: boolean;
  num_sessions: number;
  num_finished: number;
  prompt: string;
  template: string;
  topic: string;
  context: string | null;
  client: string | null;
  summary: string | null;
  final_report_sent: boolean;
  start_time: ColumnType<Date | string, Date | string | undefined, never>;
  last_edit: Generated<Date>;
}

export interface UserSessionsTable {
  id: Generated<string>;
  session_id: string;
  user_id: string;
  template: string;
  feedback: string | null;
  chat_text: string | null;
  thread_id: string | null;
  result_text: string | null;
  bot_id: string | null;
  host_chat_id: string | null;
  active: boolean;
  step: number;
  start_time: ColumnType<Date, Date | string | undefined, never>;
  last_edit: Generated<Date>;
}

// Database names:
export interface Databases {
  host_data: HostSessionsTable;
  user_data: UserSessionsTable;
}

export type HostSession = Selectable<HostSessionsTable>;
export type NewHostSession = Insertable<HostSessionsTable>;
export type HostSessionUpdate = Updateable<HostSessionsTable>;
export type UserSession = Selectable<UserSessionsTable>;
export type NewUserSession = Insertable<UserSessionsTable>;
export type UserSessionUpdate = Updateable<UserSessionsTable>;

// Triggers & Setup helpers:

// ***** TRIGGER running on pg to update the last_edit on summary changes: *****
function createTriggerUpdateLastEditSummary(
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
function createTriggerUpdateLastEditChatText(
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
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`substr(md5(random()::text), 1, 12)`))
    .addColumn('active', 'boolean', (col) => col.notNull())
    .addColumn('num_sessions', 'integer', (col) => col.notNull())
    .addColumn('num_finished', 'integer', (col) => col.notNull())
    .addColumn('prompt', 'text', (col) => col.notNull())
    .addColumn('template', 'text', (col) => col.notNull())
    .addColumn('topic', 'text', (col) => col.notNull())
    .addColumn('context', 'text')
    .addColumn('client', 'text')
    .addColumn('summary', 'text')
    .addColumn('final_report_sent', 'boolean', (col) => col.notNull())
    .addColumn('start_time', 'timestamp')
    .addColumn('last_edit', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}

export async function createUserTable(
  db: Kysely<any>,
  tableName: string = 'temp_user_db'
) {
  await db.schema
    .createTable(tableName)
    .addColumn('id', 'text', (col) => col.primaryKey().defaultTo(sql`substr(md5(random()::text), 1, 12)`))
    .addColumn('session_id', 'text', (col) => col.notNull())
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('chat_text', 'text')
    .addColumn('template', 'text', (col) => col.notNull())
    .addColumn('feedback', 'text')
    .addColumn('thread_id', 'text')
    .addColumn('result_text', 'text')
    .addColumn('bot_id', 'text')
    .addColumn('host_chat_id', 'text')
    .addColumn('active', 'boolean', (col) => col.notNull())
    .addColumn('step', 'numeric', (col) => col.notNull())
    .addColumn('start_time', 'timestamp')
    .addColumn('last_edit', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}
