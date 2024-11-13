import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getFromMakeWebhook } from '../dbUtils';

export const maxDuration = 200;

// Getting info for one session (host & all user sessions)
export async function POST(request: Request) {
  console.warn('Using legacy Make API to fetch sessions');
  const req_body = await request.json();
  return getFromMakeWebhook(req_body);
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
