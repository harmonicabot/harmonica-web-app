import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  AccumulatedSessionData,
  RawSessionData,
  RequestData,
} from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function accumulateSessionData(
  data: RawSessionData,
): AccumulatedSessionData {
  // console.log('Raw session data:', data);

  const userSessions = Object.values(data.user_data);
  const total_sessions = userSessions.length;
  // This should always be a number, but the types between User&Session data aren't separated well enough... so let's handle both
  const active = userSessions.filter((session) =>
    typeof session.active === 'number' ? session.active > 0 : session.active,
  ).length;
  const finished = total_sessions - active;

  const accumulated: AccumulatedSessionData = {
    session_data: {
      num_sessions: total_sessions,
      active: active,
      finished: finished,
      summary: data.session_data.result,
      template: data.session_data.template || '',
      topic: data.session_data.topic,
      context: data.session_data.context,
      finalReportSent: data.session_data.final_report_sent,
      start_time: data.session_data.start_time,
    },
    user_data: data.user_data,
  };
  // console.log('Accumulated session data:', accumulated.session_data);
  return accumulated;
}

export const sendApiCall = async (request: RequestData) => {
  console.log('Sending API call:', request);
  const response = await fetch('/api/' + request.target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error('Error from API:', response.status, response.statusText);
    return null;
  }
  
  if (request.stream) {
    console.log('Streaming response:', response.body);
    return response.body;
  } else {
    const responseText = await response.text();
    const result = JSON.parse(responseText);
    console.log('API response:', result);
    return result;
  }
};

export const sendCallToMake = async (body: RequestData) => {
  return sendApiCall({
    target: 'session',
    ...body,
  });
};