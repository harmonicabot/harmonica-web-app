import { NextResponse } from "next/server";

export async function getSession(body) {
  // This is just a middleman that 'forwards' the api call to the make.com database and back to the caller:
  const url = process.env.DATABASE_URL;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      data: {
        ...body.data,
        client: process.env.CLIENT_ID
      },
    }),
  }).catch((error) => {
    console.error('Error sending or receiving API call:', error);
    return error;
  })

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