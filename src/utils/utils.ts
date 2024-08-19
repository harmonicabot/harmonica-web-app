import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  AccumulatedSessionData,
  MakeRequestData,
  RawSessionData,
  RequestData,
} from 'utils/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function accumulateSessionData(
  data: RawSessionData,
): AccumulatedSessionData {
  console.log('Raw session data:', data);

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
    },
    user_data: data.user_data,
  };
  console.log('Accumulated session data:', accumulated.session_data);
  return accumulated;
}

export const sendApiCall = async (body: RequestData) => {
  console.log('Sending API call:', body);
  const response = await fetch('/api/' + body.target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error('Error from API:', response.status, response.statusText);
    return null;
  }

  const responseText = await response.text();
  const result = JSON.parse(responseText);
  return result;
};

export const sendCallToMake = async (body: MakeRequestData) => {
  return sendApiCall({
    target: 'session',
    ...body,
  });
};
