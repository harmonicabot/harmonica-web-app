import { type ClassValue, clsx } from 'clsx';
import { NextResponse } from 'next/server';
import { twMerge } from 'tailwind-merge';
import { AccumulatedSessionData, RequestData, Sessions } from 'utils/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function accumulateSessionData(data: Sessions) {
  const accumulated: AccumulatedSessionData = {
    num_sessions: data.length,
    active: 0,
    finished: 0,
    summary: '',
    template: '',
    topic: '',
    context: '',
  };

  data.forEach((session) => {
    accumulated.active += session.active ? 1 : 0;
    accumulated.finished += session.active ? 0 : 1;
    accumulated.summary = session.result_text || accumulated.summary;
    accumulated.template = session.template || accumulated.template;
    accumulated.topic = session.topic || accumulated.topic;
    accumulated.context = session.context || accumulated.context;
  });

  return accumulated;
}

export const sendApiCall = async (body: RequestData) => {
  console.log('Sending API call:', body);
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error('Error from API:', response.status, response.statusText);
    return [];
  }

  const responseText = await response.text();
  console.log('Raw response: ', responseText);
  const result = JSON.parse(responseText);
  console.log('API response:', result);
  return result;
};
