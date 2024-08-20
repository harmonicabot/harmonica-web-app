// TODO: Clean up types to make them more concise and intuitive.
//  There's just too much going on right now and the separation between
//  UserData, SessionData & AccumulatedData isn't clear enough.

export type AllRawSessionData = {
  all_session_data: RawSessionOverview[];
  all_user_data: Record<string, UserSessionData>[];
};

export type RawSessionData = {
  session_data: RawSessionOverview;
  user_data: Record<string, UserSessionData>;
};

export type AllAccumulatedSessionData = {
  accumulated_data: Record<string, AccumulatedSessionData>;
};

export type AccumulatedSessionData = {
  session_data: SessionOverview;
  user_data: Record<string, UserSessionData>;
};

export type MultipleSessions = {
  session_ids: Set<string>;
};

export enum ApiAction {
  CreatePrompt = 'createPrompt',
  CreateAssistant = 'createAssistant',
  DeleteSession = 'deleteSession',
  CreateSummary = 'create summary',
  SendFinalReport = 'send final report',
  Stats = 'stats',
  CreateSession = 'create session',
}

export enum ApiTarget {
  Builder = 'builder',
  Session = 'session',
}

export type RequestData = {
  action: ApiAction;
  target: ApiTarget;
  data: WebhookData | MultipleSessions | TemplateBuilderData | AssistantBuilderData;
};

export type RawSessionOverview = {
  topic: string;
  context: string;
  result: string;
  template?: string;
  start_time?: Date;
  botId?: string;
  final_report_sent?: boolean;
};

type SessionOverview = {
  num_sessions: number;
  active: number;
  finished: number;
  summary: string;
  template: string;
  topic: string;
  context: string;
  finalReportSent: boolean;
};

// All of the fields are marked as optional,
//  because sometimes we need only session_id,
//  and sometimes only some of the others;
//  but splitting them out and making a union of either | or
//  would result in having to do type narrowing and some other stuff
//  which is kinda annoying. 🥴
// TODO: This might also be a bit misrepresenting now and should probably be renamed:
//  the data types have changed and this isn't purely _USER_data, but more an amalgamation of
//  user AND Session Data, I think. Or possibly it is ONLY userData now
//  in which case some fields should be updated.
//  Whatever it is, right now it's difficult to know what it actually is 😵‍💫
export type UserSessionData = {
  session_id?: string;
  active?: number | boolean;
  user_id?: string;
  template?: string;
  feedback?: string;
  chat_text?: string;
  thread_id?: string;
  result_text?: string;
  topic?: string;
  context?: string;
  bot_id?: string;
  host_chat_id?: string;
};

export type WebhookData = {
  session_id?: string;
  template?: string;
  topic?: string;
  context?: string;
  bot_id?: string;
  host_chat_id?: string;
  finished?: number;
};

export type TemplateBuilderData = {
  templateName: string;
  taskDescription: string;
  createSummary: boolean;
  summaryFeedback: boolean;
  requireContext: boolean;
  contextDescription: string;
  enableSkipSteps: boolean;
};

export type AssistantBuilderData = {
  prompt: string;
  name: string;
}

export type UserSessions = Record<string, UserSessionData>;
