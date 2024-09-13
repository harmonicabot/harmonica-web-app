import type { NextApiRequest, NextApiResponse } from 'next'
import { NextResponse } from 'next/server';

const sessionStore = 17957
const userStore = 17913
      
let limit = 90
const token = process.env.MAKE_AUTH_TOKEN;

function getUrl(storeId: number, includeLimit: boolean = true, offset: number = 0) {
  return `https://eu2.make.com/api/v2/data-stores/${storeId}/data`
    + (includeLimit ? "?pg[limit]=" + limit + "&pg[offset]=" + offset: "")
    // + (sortBy? "&pg[sortBy]=" + sortBy : "") // Sorting not allowed for this api 😢
}

export async function GET(request: Request) {

  try {
    const [sessionData, userData] = await Promise.all([
      fetch(getUrl(sessionStore), {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(getUrl(userStore, true, 0), {
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
    const expected = userJson.count; 
    let available = limit; 
    while (expected > available) {
      const batch = await fetch(getUrl(userStore, true, available), {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const batchJson = await batch.json()
      userJson.records.push(... batchJson.records);
      available += limit;
    }

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
    body: JSON.stringify({ keys: ids })
  });

  return NextResponse.json({ message: 'Deletion successful' });
}



type DbResponse = {
  records?: any[];
  count: number;
  pg: {
    limit: number;
    offset: number;
  }
}  
  
