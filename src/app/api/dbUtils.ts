import { NextResponse } from "next/server";
import { getSession as authGetSession } from '@auth0/nextjs-auth0';

export async function getSessionFromMake(body: any) {
  // This is just a middleman that 'forwards' the api call to the make.com database and back to the caller:
  const url = process.env.MAKE_DATABASE_URL ?? '';
  const sessionData = await authGetSession();
  
  let clientId = "";
  if (sessionData && sessionData.user) {
    const user = sessionData.user;
    clientId = process.env.CLIENT_ID ? process.env.CLIENT_ID : user?.sub || "";
  } else {
    clientId = process.env.CLIENT_ID ? process.env.CLIENT_ID : "";
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      data: {
        ...body.data,
        client: clientId
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