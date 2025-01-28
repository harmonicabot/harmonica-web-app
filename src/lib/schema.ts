'use server';
import { createKysely } from '@vercel/postgres-kysely';
import {
  Generated,
  ColumnType,
  Selectable,
  Insertable,
  Updateable,
  RawBuilder,
  PostgresDialect,
  AlterColumnBuilder,
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
  client?: string;
  summary?: string;
  start_time: ColumnType<Date, Date | undefined, never>;
  last_edit: Generated<Date>;
  goal: string;
  critical?: string,
  context?: string;
  prompt_summary: string,
  questions?: JSON;
}

export interface UserSessionsTable {
  id: Generated<string>;
  session_id: string;
  user_id: string;
  thread_id: string;
  active: boolean;
  include_in_summary: Generated<boolean>; // Default to 'true'
  user_name?: string;
  feedback?: string;
  summary?: string;
  language?: string;
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

export interface CustomResponsesTable {
  id: Generated<string>;
  position: number;
  session_id: string;
  content: string;
  created_at: Generated<Date>;
}

export type HostSession = Selectable<HostSessionsTable>;
export type NewHostSession = Insertable<HostSessionsTable>;
export type HostSessionUpdate = Updateable<HostSessionsTable>;
export type UserSession = Selectable<UserSessionsTable>;
export type NewUserSession = Insertable<UserSessionsTable>;
export type UserSessionUpdate = Updateable<UserSessionsTable>;
export type Message = Selectable<MessagesTable>;
export type NewMessage = Insertable<MessagesTable>;
export type CustomResponse = Selectable<CustomResponsesTable>
export type NewCustomResponse = Insertable<CustomResponsesTable>
export type CustomResponseUpdate = Updateable<CustomResponsesTable>

const hostTableName = 'host_db';
const userTableName = 'user_db';
const messageTableName = 'messages_db';
const customResponsesTableName = 'custom_responses'

// Triggers & Setup helpers:

// ***** TRIGGER running on pg to update the last_edit on summary changes: *****
export async function createTriggerOnHostUpdateLastEditSummary() {
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
    BEFORE UPDATE ON ${hostTableName}
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edit_summary();
`;
}

// ***** TRIGGER running on pg to update the last_edit on chat_text change: *****
export async function createTriggerOnUserUpdateLastEditChatText() {
  sql`CREATE OR REPLACE FUNCTION update_last_edit()
RETURNS TRIGGER AS $$
BEGIN
        NEW.last_edit = CURRENT_TIMESTAMP;
        NEW.last_edit = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_edit_on_chat_change
    BEFORE UPDATE ON ${userTableName}
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edit();
`;
}

export async function createDbInstance<T extends Record<string, any>>() {
  try {
    const url = process.env.POSTGRES_URL;
    console.log('Creating DB instance with URL:', url);
    let db;
    if (url?.includes('localhost')) {
      const dialect = new PostgresDialect({
        pool: new pg.Pool({
          connectionString: url
        })
      });
      db = new Kysely<T>({ dialect });
    } else {
      db = createKysely<T>()
    }
    
    console.log('Database connection successful');
    return db;
  } catch (e) {
    console.error(e)
    console.log("POSTGRES_URL: ", process.env.POSTGRES_URL)
    throw e
  }
}

export async function createCustomDbInstance<T extends Record<string, any>>(
  host = 'temp_host_db',
  user = 'temp_user_db',
  message = 'temp_message_db',
  connectionUrl = process.env.CUSTOM_DATABASE,
) {
  const dialect = new PostgresDialect({
    pool: new pg.Pool({
      connectionString: connectionUrl,
      max: 10,
    }),
  });
  const db = new Kysely<T>({ dialect });
  return { db, dbNames: { host, user, message } };
}
