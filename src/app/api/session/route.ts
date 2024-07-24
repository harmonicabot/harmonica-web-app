import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const url = process.env.DATABASE_URL;
  const req_body = await request.json();
  console.log('ReqBody: ', req_body);

  // This is just a middleman that 'forwards' the api call to the make.com database and back to the caller:
  console.warn('Doing a web call to URL: ', url);
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
  console.log("Raw response:", responseText);
  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers);
  const responseData = JSON.parse(responseText);
  console.log('Response data: ', responseData);
  return NextResponse.json(responseData);
}
