import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { RawSessionData, UserSessionData } from '@/lib/types';
import * as db from '@/lib/db';
import { HostSession } from '@/lib/schema';

export const maxDuration = 200;

// Getting info for one session (host & all user sessions)
export async function POST(request: Request) {
  const req_body = await request.json();
  const id = req_body.data.session_id ?? (() => {
    console.error('Missing session_id');
    throw NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  })();
  const hostSession: HostSession = (await db.getHostSessionById(id))[0];
  console.log('Host session: ', hostSession);
  
  const userSessions = await db.searchUserSessions("session_id", id);
  console.log('User sessions: ', userSessions);
  const userSessionsRecord = userSessions.reduce<Record<string, UserSessionData>>((acc, session) => {
    acc[session.id] = {
      ...session,
      feedback: session.feedback ?? undefined,
      chat_text: session.chat_text ?? undefined,
      result_text: session.result_text ?? undefined,
      bot_id: session.bot_id ?? undefined,
      host_chat_id: session.host_chat_id ?? undefined
    };
    return acc;
  }, {});
  const responseObject: RawSessionData = {
    session_data: hostSession,
    user_data: userSessionsRecord,
  };
  return NextResponse.json(responseObject, { status: 200 });

}

// Getting info for all OpenAI assistants
export async function GET() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const assistants = await client.beta.assistants.list();
  const assistantInfo = assistants.data.map((assistant) => ({
    name: assistant.name,
    id: assistant.id,
  }));

  return NextResponse.json(assistantInfo);
}
