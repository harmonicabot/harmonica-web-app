import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  const url = process.env.DATABASE_URL;
  const req_body = await request.json();
  // console.log('ReqBody: ', req_body);
  // This is just a middleman that 'forwards' the api call to the make.com database and back to the caller:
  console.warn('Doing a web call to URL: ', url); // 'warn' because we want to reduce web calls as much as possible
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req_body),
  });

  if (!response.ok) {
    console.log('Error encountered! Status: ', response.status);
    return NextResponse.json({
      error: `HTTP error: ${response.status}`,
    });
  }
  const responseText = await response.text();
  if (responseText === 'Accepted') {
    // This might happen e.g. when we 'redetermine data structures' in individual make modules
    return NextResponse.json({
      success: responseText,
    });
  }
  const responseData = JSON.parse(responseText);
  console.log('Response data: ', responseData);
  return NextResponse.json(responseData);
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
