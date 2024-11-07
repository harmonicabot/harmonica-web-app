import { Generated, ColumnType, Selectable, Insertable, Updateable } from 'kysely';
import { User } from 'next-auth';
import { sql } from 'kysely';

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
  last_edit: Generated<Date>;
}

/* ***** TRIGGER running on pg to update the last_edit on summary changes: *****
CREATE OR REPLACE FUNCTION update_last_edit_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.summary IS DISTINCT FROM OLD.summary THEN
        NEW.last_edit = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_edit_on_summary_change
    BEFORE UPDATE ON host_data
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edit_summary();
*/


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
  start_time: ColumnType<Date, Date | string | undefined, never>;
  last_edit: Generated<Date>;
}

/* ***** TRIGGER running on pg to update the last_edit on chat_text change: *****
CREATE OR REPLACE FUNCTION update_last_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.chat_text IS DISTINCT FROM OLD.chat_text THEN
        NEW.last_edit = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_edit_on_chat_change
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edit();
*/

// Database names:
export interface Databases {
  host_data: HostSessionsTable;
  user_data: UserSessionsTable;
}

export type HostSession = Selectable<HostSessionsTable>
export type NewHostSession = Insertable<HostSessionsTable>
export type HostSessionUpdate = Updateable<HostSessionsTable>
export type UserSession = Selectable<UserSessionsTable>
export type NewUserSession = Insertable<UserSessionsTable>
export type UserSessionUpdate = Updateable<UserSessionsTable>
