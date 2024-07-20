import { SessionData } from "app/home/page";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type AccumulatedSessionData = {
  num_sessions: number;
  active: number;
  finished: number;
  summary: string;
  template: string;
  topic: string;
  context: string;
};

export function accumulateSessionData(data: SessionData[]) {
  const accumulated: AccumulatedSessionData = {
    num_sessions: data.length,
    active: 0,
    finished: 0,
    summary: '',
    template: '',
    topic: '',
    context: '',
  }

  data.forEach((session) => {
    accumulated.active += session.active ? 1 : 0
    accumulated.finished += session.active ? 0 : 1
    accumulated.summary = session.result_text || accumulated.summary
    accumulated.template = session.template || accumulated.template
    accumulated.topic = session.topic || accumulated.topic
    accumulated.context = session.context || accumulated.context
  })

  return accumulated
}
