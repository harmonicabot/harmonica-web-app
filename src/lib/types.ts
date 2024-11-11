// TODO: Clean up types to make them more concise and intuitive.
//  There's just too much going on right now and the separation between
//  UserData, SessionData & AccumulatedData isn't clear enough.

import { HostSession, UserSession } from "./schema";

export type HostAndUserData = {
  host_data: HostSession;
  user_data: UserSession[];
};

export type AllSessionsData = Record<string, HostAndUserData>;

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
  Session = 'session',
  Sessions = 'sessions',
  Chat = 'chat',
  Export = 'export',
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
    | { assistantIds: string[]; }
    | { chatMessages: string[]; exportDataQuery: string; };
};

// use this insteads of Message
export type OpenAIMessage = { role: 'assistant' | 'user'; content: string };


export type WebhookData = {
  session_id?: string;
  template?: string;
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
  createSummary: boolean;
  summaryFeedback: boolean;
  requireContext: boolean;
  contextDescription: string;
  enableSkipSteps: boolean;
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
