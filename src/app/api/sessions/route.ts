import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export const maxDuration = 200;

const sessionStore = 17957;
const userStore = 17913;

let limit = 100;
const token = process.env.MAKE_AUTH_TOKEN;


function getUrl(
  storeId: number,
  includeLimit: boolean = true,
  offset: number = 20,
) {
  return (
    `https://eu2.make.com/api/v2/data-stores/${storeId}/data` +
    (includeLimit ? '?pg[limit]=' + limit + '&pg[offset]=' + offset : '')
  );
  // + (sortBy? "&pg[sortBy]=" + sortBy : "") // Sorting not allowed for this api 😢
}

export async function GET(request: Request) {
  const { user } = await getSession();
  const clientId = process.env.CLIENT_ID ? process.env.CLIENT_ID : user?.sub || "";
  try {
    const [sessionData, userData] = await Promise.all([
      fetch(getUrl(sessionStore), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(getUrl(userStore, true, 0), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    const userJson: DbResponse = await userData.json();
    let sessionJson: DbResponse = await sessionData.json();
    // console.log(`Got session data for ClientID '${clientId}': `, sessionJson.records || []);
    let clientSessions: DbResponse['records'] = [];
    if (clientId && clientId.length === 0) {
      // get all sessions that do NOT belong to any client, mainly for internal testing purposes
      clientSessions = sessionJson.records?.filter(
        (sessionData) =>
          !('client' in sessionData.data)
          || sessionData.data.client === null
          || sessionData.data.client === ''
      );
    } else {
      clientSessions = sessionJson.records?.filter(
        (sessionData) => sessionData.data.client === clientId
      );
    }
    sessionJson = {
      ...sessionJson,
      records: clientSessions,
      count: clientSessions.length,
    };
    // console.log(`Session data after filtering ClientID '${clientId}': `, sessionJson.records || []);
    // console.log("Got user data: ", userJson.records?.slice(0, 5) || []);
    const expected = userJson.count;
    let available = limit;
    while (expected > available) {
      const batch = await fetch(getUrl(userStore, true, available), {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const batchJson = await batch.json();
      userJson.records.push(...batchJson.records);
      available += limit;
    }

    return NextResponse.json({ userData: userJson, sessionData: sessionJson });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: `Failed to fetch data: ${error}` },
      { status: 500 },
    );
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
    return NextResponse.json(
      { error: 'Invalid database specified' },
      { status: 400 },
    );
  }

  let response = await fetch(getUrl(storeId, false), {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ keys: ids }),
  });

  if (!response.ok) {
    console.error(
      'There was a problem deleting ids:',
      response.status,
      response.statusText
    );
    return NextResponse.json({ message: 'Deletion failed: ' + response.statusText }, { status: 500 });
  }

  return NextResponse.json({ message: 'Deletion successful' });
}

type DbResponse = {
  records?: any[];
  count: number;
  pg: {
    limit: number;
    offset: number;
  };
};
