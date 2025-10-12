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
} from 'kysely';
import { Kysely } from 'kysely';
import pg from 'pg';

export interface HostSessionsTable {
  id: Generated<string>;
  active: boolean;
  num_sessions: ColumnType<number, number, number | RawBuilder<unknown>>;
  num_finished: ColumnType<number, number, number | RawBuilder<unknown>>;
  prompt: string;
  assistant_id: string;
  template_id?: string; // the id of the template from templates.json;
  summary_assistant_id: string;
  topic: string;
  final_report_sent: boolean;
  summary?: string;
  start_time: ColumnType<Date, Date | undefined, never>;
  last_edit: Generated<Date>;
  goal: string;
  critical?: string;
  context?: string;
  prompt_summary: string; // Note: This is NOT the prompt that is used to _generate_ the summary, but a _summarization of the full prompt_ that is displayed to the user.
  summary_prompt?: string; // THIS is the prompt used to generate the summary! (if different from the default)
  questions?: JSON;
  visibility_settings?: ResultTabsVisibilityConfig;
  cross_pollination: Generated<boolean>; // Default to true
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
  start_time: ColumnType<Date, Date | undefined, never>;
  last_edit: Generated<Date>;
}

export interface MessagesTable {
  id: Generated<string>;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Generated<Date>;
  is_final?: boolean;
}

export interface CustomResponsesTable {
  id: Generated<string>;
  position: number;
  session_id: string; // Could also be workspace_id!
  content: string;
  response_type: string; // Which table this is going to be in
  created_at: Generated<Date>;
}

export interface WorkspacesTable {
  id: Generated<string>;
  title: string;
  description?: string;
  location?: string;
  summary?: string;
  parent_id?: string;
  bannerImage?: string;
  gradientFrom?: string;
  gradientTo?: string;
  useGradient?: boolean;
  status: 'active' | 'draft' | 'deleted';
  created_at: Generated<Date>;
  last_modified: Generated<Date>;
  visibility_settings?: ResultTabsVisibilityConfig;
  summary_prompt?: string;
}

export interface ResultTabsVisibilityConfig {
  showSummary?: boolean;
  showSessionRecap?: boolean;
  showResponses?: boolean;
  showCustomInsights?: boolean;
  showSimScore?: boolean;
  showChat?: boolean;
  allowCustomInsightsEditing?: boolean;
  showKnowledge?: boolean;
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
  resource_type: 'SESSION' | 'WORKSPACE';
}

export interface InvitationsTable {
  id: Generated<string>;
  email: string;
  resource_id: string;
  resource_type: 'SESSION' | 'WORKSPACE';
  role: 'admin' | 'owner' | 'editor' | 'viewer' | 'none';
  message?: string;
  created_by?: string; // The user_id (sub) of who created the invitation
  created_at: Generated<Date>;
  accepted: Generated<boolean>; // Default to false
}

export interface UsersTable {
  id: string; // Auth0 sub
  email: string;
  name?: string;
  avatar_url?: string;
  last_login: Generated<Date>;
  created_at: Generated<Date>;
  metadata?: JSON;
  // Subscription fields
  subscription_status: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscription_id?: string;
  subscription_period_end?: Date;
  stripe_customer_id?: string;
}

export type PromptsTable = {
  id: Generated<string>;
  prompt_type: string;
  instructions: string;
  active: boolean;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type PromptTypesTable = {
  id: string;
  name: string;
  description: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type HostSession = Selectable<HostSessionsTable>;
export type NewHostSession = Insertable<HostSessionsTable>;
export type HostSessionUpdate = Updateable<HostSessionsTable>;
export type UserSession = Selectable<UserSessionsTable>;
export type NewUserSession = Insertable<UserSessionsTable>;
export type UserSessionUpdate = Updateable<UserSessionsTable>;
export type Message = Selectable<MessagesTable>;
export type NewMessage = Insertable<MessagesTable>;
export type CustomResponse = Selectable<CustomResponsesTable>;
export type NewCustomResponse = Insertable<CustomResponsesTable>;
export type CustomResponseUpdate = Updateable<CustomResponsesTable>;
export type Workspace = Selectable<WorkspacesTable>;
export type NewWorkspace = Insertable<WorkspacesTable>;
export type WorkspaceUpdate = Updateable<WorkspacesTable>;
export type Permission = Selectable<PermissionsTable>;
export type NewPermission = Insertable<PermissionsTable>;
export type PermissionUpdate = Updateable<PermissionsTable>;
export type Invitation = Selectable<InvitationsTable>;
export type NewInvitation = Insertable<InvitationsTable>;
export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
export type Prompt = Selectable<PromptsTable>;
export type NewPrompt = Insertable<PromptsTable>;
export type PromptUpdate = Updateable<PromptsTable>;
export type PromptType = Selectable<PromptTypesTable>;
export type NewPromptType = Insertable<PromptTypesTable>;
export type PromptTypeUpdate = Updateable<PromptTypesTable>;

// Also add this type for better type safety
export type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface SessionFilesTable {
  id: Generated<number>;
  session_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by: string;
  uploaded_at: Generated<Date>;
  is_deleted: Generated<boolean>;
  metadata?: JSON;
  file_purpose?: 'TRANSCRIPT' | 'KNOWLEDGE';
}

export interface SessionRatingsTable {
  id: Generated<string>;
  thread_id: string;
  rating: number;
  feedback?: string;
  created_at: Generated<Date>;
  user_id?: string;
}

export type SessionRating = Selectable<SessionRatingsTable>;
export type NewSessionRating = Insertable<SessionRatingsTable>;
export type SessionRatingUpdate = Updateable<SessionRatingsTable>;

export async function createDbInstance<T extends Record<string, any>>() {
  try {
    const url = process.env.POSTGRES_URL;
    console.log('Creating DB instance with URL:', url);
    let db;
    if (url?.includes('localhost')) {
      const dialect = new PostgresDialect({
        pool: new pg.Pool({
          connectionString: url,
        }),
      });
      db = new Kysely<T>({ dialect });
    } else {
      db = createKysely<T>();
    }

    console.log('Database connection successful');
    return db;
  } catch (e) {
    console.error(e);
    console.log('POSTGRES_URL: ', process.env.POSTGRES_URL);
    throw e;
  }
}
