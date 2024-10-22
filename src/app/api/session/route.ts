import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '../dbUtils';

export const maxDuration = 200;
export async function POST(request: Request) {
  const req_body = await request.json();
  return getSession(req_body);
}

export async function GET(request: Request) {
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
