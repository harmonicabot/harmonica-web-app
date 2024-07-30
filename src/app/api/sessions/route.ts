import type { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server';

const sessionStore = 17957
const userStore = 17913
      
let limit = "?pg[limit]=100"
const token = process.env.MAKE_AUTH_TOKEN;

function getUrl(storeId: number, includeLimit: boolean = true) {
  return `https://eu2.make.com/api/v2/data-stores/${storeId}/data` + (includeLimit ? limit : "")
}

export async function GET(request: Request) {

  try {
    const [userData, sessionData] = await Promise.all([
      fetch(getUrl(sessionStore), {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(getUrl(userStore), {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const userJson: DbResponse  = await userData.json();
    const sessionJson: DbResponse = await sessionData.json();
    console.log("Got session data: ", sessionJson.records?.slice(0, 5) || []);
    console.log("Got user data: ", userJson.records?.slice(0, 5) || []);

    return NextResponse.json({ userData: userJson, sessionData: sessionJson });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: `Failed to fetch data: ${error}`}, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { ids, database } = await request.json();
  
  let storeId;
  if (database === 'user') {
    storeId = userStore; // User store ID
  } else if (database === 'session') {
    storeId = sessionStore; // Session store ID
  } else {
    return NextResponse.json({ error: 'Invalid database specified' }, { status: 400 });
  }

  let response = await fetch(getUrl(storeId, false), {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids: ids })
  });

  return NextResponse.json({ message: 'Deletion successful' });
}



type DbResponse = {
  records?: any[];
}  
  
