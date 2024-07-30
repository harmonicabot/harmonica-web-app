export type AllRawSessionData = {
  all_session_data: RawSessionOverview[]
  all_user_data: Record<string, UserSessionData>[];
};

export type RawSessionData = {
  session_data: RawSessionOverview
  user_data: Record<string, UserSessionData>;
};

export type AllAccumulatedSessionData = {
  accumulated_data: Record<string, AccumulatedSessionData>
};

export type AccumulatedSessionData = {
  session_data: SessionOverview
  user_data: Record<string, UserSessionData>;
};

export type MultipleSessions = {
  session_ids: Set<string>;
};

export type RequestData = {
  action: string;
  data?: UserSessionData | MultipleSessions;
}

export type RawSessionOverview = {
  topic: string;
  context: string;
  summary: string;
  template?: string;
  session_id: string;
}

type SessionOverview = {
  num_sessions: number;
  active: number;
  finished: number;
  summary: string;
  template: string;
  topic: string;
  context: string;
}

// All of the fields are marked as optional, 
//  because sometimes we need only session_id, 
//  and sometimes only some of the others;
//  but splitting them out and making a union of either | or
//  would result in having to do type narrowing and some other stuff
//  which is kinda annoying. 🥴
export type UserSessionData = {
  session_id?: string;
  active?: number | boolean;
  user_id?: string;
  template?: string;
  feedback?: string;
  chat_text?: string;
  thread_id?: string;
  result_text?: string;
  context?: string;
  topic?: string;
  botId?: string;
  host_chat_id?: string;
  start_time?: string;
};

export type UserSessions = Record<string, UserSessionData>;