export type AccumulatedSessionData = {
  num_sessions: number;
  active: number;
  finished: number;
  summary: string;
  template: string;
  topic: string;
  context: string;
};

export type RequestData = {
  action: string;
  data?: SessionData;
}

// All of the fields are marked as optional, 
//  because sometimes we need only session_id, 
//  and sometimes only some of the others;
//  but splitting them out and making a union of either | or
//  would result in having to do type narrowing and some other stuff
//  which is kinda annoying. 🥴
export type SessionData = {
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

export type Sessions = SessionData[];