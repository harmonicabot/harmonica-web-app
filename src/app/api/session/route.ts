import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const url = process.env.DATABASE_URL;
  const req_body = await request.json()
  console.log("ReqBody: ", req_body);

  // This is just a middleman that 'forwards' the api call to the make.com database and back to the caller:
  try {
    console.warn("Doing a web call to URL: ", url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req_body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}\n\nFull Response: ${await response.json()}`);
    }
    const responseData = await response.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error sending API call:', error);
    throw error;
  }
}
