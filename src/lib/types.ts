// TODO: Clean up types to make them more concise and intuitive.
//  There's just too much going on right now and the separation between
//  UserData, SessionData & AccumulatedData isn't clear enough.

import { UserSession, Message, HostSession } from './schema';

export enum ApiAction {
  CreatePrompt = 'createPrompt',
  EditPrompt = 'editPrompt',
  CreateAssistant = 'createAssistant',
  DeleteSession = 'deleteSession',
  CreateSummary = 'create summary',
  SendFinalReport = 'send final report',
  Stats = 'stats',
  CreateThread = 'createThread',
  GenerateAnswer = 'generateAnswer',
  DeleteAssistants = 'delete assistants',
  ExportSession = 'export session',
}

export enum ApiTarget {
  Builder = 'builder',
}

export type RequestData = {
  action: ApiAction;
  target: ApiTarget;
  stream?: boolean;
  data:
    | WebhookData
    | SessionBuilderData
    | AssistantBuilderData
    | AssistantMessageData
    | TemplateEditingData
    | UserSession
    | OpenAIMessage[]
    | string
    | { assistantIds: string[] }
    | { chatMessages: string[]; exportDataQuery: string };
};

// use this insteads of Message
export interface OpenAIMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface OpenAIMessageWithContext extends OpenAIMessage {
  userData?: UserSession[];
}

export type WebhookData = {
  session_id?: string;
  assistant_id?: string;
  topic?: string;
  context?: string;
  bot_id?: string;
  host_chat_id?: string;
  finished?: number;
};

export type SessionBuilderData = {
  sessionName: string;
  goal: string;
  critical: string;
  context: string;
};

export type TemplateEditingData = {
  threadId: string;
  assistantId: string;
  instructions: string;
};

export type AssistantBuilderData = {
  prompt: string;
  name: string;
};

export type AssistantMessageData = {
  threadId: string;
  messageText: string;
  assistantId: string;
};

export type UserSessions = Record<string, UserSession>;

export type Session = {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
};

export interface ResultTabsProps {
  hostData: HostSession[];
  userData: UserSession[];
  id: string;
  isWorkspace?: boolean;
  hasNewMessages: boolean;
  showParticipants: boolean;
  showSessionRecap?: boolean;
  sessionIds?: string[];
  chatEntryMessage?: OpenAIMessage;
}

export interface CustomAIResponse {
  id?: string;
  position: number;
  session_id: string;
  content: string;
  created_at?: Date;
}
