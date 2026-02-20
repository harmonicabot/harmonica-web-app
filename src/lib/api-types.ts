/**
 * Harmonica REST API v1 — shared type definitions.
 *
 * Used by:
 * - API route handlers (harmonica-web-app)
 * - MCP server (harmonica-mcp)
 * - Any future API client
 */

// ─── Sessions ────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'completed';

export interface SessionListItem {
  id: string;
  topic: string;
  goal: string;
  status: SessionStatus;
  participant_count: number;
  created_at: string;
  updated_at: string;
}

export interface Session extends SessionListItem {
  critical: string | null;
  context: string | null;
  summary: string | null;
}

export interface CreateSessionRequest {
  topic: string;
  goal: string;
  context?: string;
  critical?: string;
  prompt?: string;
  template_id?: string;
  questions?: Array<{ label: string }>;
  cross_pollination?: boolean;
}

export interface SessionCreated extends SessionListItem {
  join_url: string;
}

// ─── Questions ───────────────────────────────────────────────────────

export interface Question {
  id: string;
  text: string;
  position: number;
}

// ─── Responses ───────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Participant {
  participant_name: string | null;
  messages: Message[];
}

export interface ResponseSubmission {
  content: string;
}

export interface ResponseCreated {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
}

// ─── Summary ─────────────────────────────────────────────────────────

export interface SessionSummary {
  session_id: string;
  summary: string | null;
  generated_at: string | null;
}

// ─── Account ─────────────────────────────────────────────────────────

export type SubscriptionStatus = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface ApiKeyInfo {
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  subscription_status: SubscriptionStatus;
  api_key: ApiKeyInfo;
}

// ─── Pagination ──────────────────────────────────────────────────────

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ListResponse<T> {
  data: T[];
}

// ─── Errors ──────────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'rate_limited'
  | 'internal_error';

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

// ─── API Key Storage (internal, not exposed in API) ──────────────────

export interface ApiKeyRow {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

// ─── Query Parameters ────────────────────────────────────────────────

export interface ListSessionsParams {
  status?: SessionStatus;
  q?: string;
  limit?: number;
  offset?: number;
}
