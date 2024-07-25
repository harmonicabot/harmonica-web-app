'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { accumulateSessionData, sendApiCall } from 'utils/utils';
import { Sessions } from "utils/types"
import type { Schema } from "../../../amplify/data/resource"
import { generateClient } from "aws-amplify/data"


export default function Home() {
  const [resultElement, setResultElement] = useState(<></>);
  
  const handleViewResults = async () => {
    let response = await sendApiCall({
      action: 'stats',
      data: { session_id: '9c02677810cc' }
    });
    
    const finishedSessions = response
    .filter(session => session.active === 0)
    .length;
    setResultElement(
      <>
        <div className="flex flex-row items-center space-x-4">
          <span>Active Sessions: {response.length}</span>
          <span>Finished Sessions: {finishedSessions}</span>
        </div>
      </>
    )
  };

  return (
    <>
      <div className="flex justify-center">
        <div className="flex flex-col space-y-8">
          <Link href="/sessions/create">
          <button
            className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Start new session
            </button>
          </Link>
          <button
            className="bg-secondary text-gray-800 py-2 px-4 rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            onClick={handleViewResults}
          >
            View Results
          </button>
          <Link href='/sessions'><button
            className="bg-accent text-gray-800 py-2 px-4 rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            See all sessions
          </button>
          </Link>
        </div>
      </div>
    </>
  );
}
