import { Generated, ColumnType, Selectable, Insertable, Updateable } from 'kysely';
import { User } from 'next-auth';

export interface HostSessionsTable {
  id: Generated<string>;
  prompt: string;
  num_sessions: number;
  active: boolean;
  finished: number;
  summary: string | null;
  template: string;
  topic: string;
  context: string | null;
  client: string | null;
  final_report_sent: boolean;
  start_time: ColumnType<Date | string, Date | string | undefined, never>;
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
  start_time: ColumnType<Date, Date | string | undefined, never>;
  active: boolean;
}

interface TempTable {
  id: Generated<number>
  name: string
  email: string
  image: string
  createdAt: ColumnType<Date, string | undefined, never>
}


// Database names:
export interface Databases {
  host_data: HostSessionsTable;
  user_data: UserSessionsTable;
  temp: TempTable;
}

export type HostSession = Selectable<HostSessionsTable>
export type NewHostSession = Insertable<HostSessionsTable>
export type HostSessionUpdate = Updateable<HostSessionsTable>
export type UserSession = Selectable<UserSessionsTable>
export type NewUserSession = Insertable<UserSessionsTable>
export type UserSessionUpdate = Updateable<UserSessionsTable>
