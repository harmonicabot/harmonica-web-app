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
  assistant_id: string;
  template_id?: string; // the id of the template from templates.json; 
  topic: string;
  final_report_sent: boolean;
  client?: string;
  summary?: string;
  start_time: ColumnType<Date, Date | undefined, never>;
  last_edit: Generated<Date>;
  goal: string;
  critical?: string;
  context?: string;
  prompt_summary: string;
  questions?: JSON;
  is_public: boolean;
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

export interface WorkspacesTable {
  id: Generated<string>;
  title: string;
  description?: string;
  parent_id?: string;
  is_public?: boolean;
  created_at: ColumnType<Date, Date | undefined, never>;
  last_modified: Generated<Date>;
}

// Mapping of which sessions belong to which workspaces
export interface WorkspaceSessionsTable {
  workspace_id: string;
  session_id: string;
}

export interface PermissionsTable {
  resource_id: string;
  user_id: string;
  role: 'admin' | 'owner' | 'editor' | 'viewer' | 'none';
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
export type Workspace = Selectable<WorkspacesTable>;
export type NewWorkspace = Insertable<WorkspacesTable>;
export type WorkspaceUpdate = Updateable<WorkspacesTable>;
export type Permission = Selectable<PermissionsTable>;
export type NewPermission = Insertable<PermissionsTable>;
export type PermissionUpdate = Updateable<PermissionsTable>;

const hostTableName = 'host_db';
const userTableName = 'user_db';
const messageTableName = 'messages_db';
const customResponsesTableName = 'custom_responses'
const workspaceTableName = 'workspaces';
const workspaceSessionsTableName = 'workspace_sessions';
const permissionsTableName = 'permissions';

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