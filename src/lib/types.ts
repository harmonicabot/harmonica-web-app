import {
  UserSession,
  Message,
  HostSession,
  ResultTabsVisibilityConfig,
  Workspace,
  NewWorkspace,
} from './schema';

export enum ApiAction {
  CreatePrompt = 'createPrompt',
  EditPrompt = 'editPrompt',
  SummaryOfPrompt = 'summaryOfPrompt',
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
    | SummaryOfPromptData
    | OpenAIMessage[]
    | string
    | { assistantIds: string[] }
    | { chatMessages: string[]; exportDataQuery: string };
};

// use this insteads of Message
export interface OpenAIMessage {
  role: 'assistant' | 'user';
  content: string;
  is_final?: boolean;
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
  crossPollination: boolean;
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
  messageText: string;
  sessionId?: string;
  systemPrompt?: string;
  threadId?: string;
};

export type SummaryOfPromptData = {
  fullPrompt: string;
  instructions: string;
};

export type UserSessions = Record<string, UserSession>;

export type Session = {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
};

export interface CustomAIResponse {
  id: string;
  position: number;
  session_id: string;
  content: string;
  created_at?: Date;
}

export interface CrossPollinationConfig {
  maxParticipants?: number;
  feedbackFrequency?: number;
  feedbackDepth?: number;
  enabled: boolean;
  sessionId: string;
}

export interface IdeaCluster {
  id: string;
  ideas: string[];
  summary: string;
  participants: string[];
}

export interface CrossPollinationConfig {
  maxParticipants?: number;
  feedbackFrequency?: number;
  feedbackDepth?: number;
  enabled: boolean;
  sessionId: string;
}

export interface IdeaCluster {
  id: string;
  ideas: string[];
  summary: string;
  participants: string[];
}

export interface ExtendedWorkspaceData {
  exists: boolean;
  workspace: Workspace | NewWorkspace;
  hostSessions: HostSession[];
  userData: UserSession[];
  sessionIds: string[];
  availableSessions?: Pick<HostSession, 'id' | 'topic' | 'start_time'>[];
}
