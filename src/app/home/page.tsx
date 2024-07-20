'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { accumulateSessionData } from 'lib/utils';

// All of the fields are marked as optional, 
//  because sometimes we need only session_id, 
//  and sometimes only some of the others;
//  but splitting them out and making a union of either | or
//  would result in having to do type narrowing and some other stuff
//  which is kinda annoying. 🥴
export type SessionData = {
  session_id?: string;
  active?: number | boolean;
  user_id?: string;
  template?: string;
  feedback?: string;
  chat_text?: string;
  thread_id?: string;
  result_text?: string;
  context?: string;
  topic?: string;
};

type RequestData = {
  action: string;
  data?: SessionData;
}

type Sessions = {
  sessions: SessionData[];
}

type GroupedSessions = Record<string, SessionData[]>;

export default function Home() {
  const [apiResult, setApiResult] = useState<SessionData[] | Sessions>(null);
  const [resultElement, setResultElement] = useState(<></>);
  const [shouldUpdateResult, setShouldUpdateResult] = useState(false);
  const [filter, setFilter] = useState<{
    any: boolean;
    active: boolean;
    finished: boolean;
    summary: boolean;
  }>({
    any: true,
    active: false,
    finished: false,
    summary: false,
  });

  useEffect(() => {
    console.log("Filter: ", filter);
    setShouldUpdateResult(true);
  }, [filter])

  const [accumulated, setAccumulatedSessions] = useSessionStore((state) => [
    state.accumulated,
    state.setAccumulatedSessions
  ])

  const handleStartNewSession = () => {
    throw new Error("Not fully implemented, just need to add a form for template, context & topic.");
    sendApiCall({
      action: 'new_session',
      data: {
        template: 'Red-Teaming',
        context: "Some context for this stuff, retrieved from a form or so",
        topic: "Next-gen governance"
      },
    }).then((response) => {
      setApiResult(response);
      setResultElement(
        <div>
            <h2>API Result:</h2>
            {JSON.stringify(apiResult, null, 2)
              .split('\n')
              .map((line) => {
                return (
                  <>{line}<br /></>
                );
              })}
          </div>
      )
    })
  };

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


  useEffect(() => {
    if (shouldUpdateResult && Object.keys(accumulated).length > 0) {
      setResultElement(
        <div>
          <div className="flex justify-center space-x-4 mt-6 mb-6">
            <button
              className={`${filter.any ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              onClick={() => 
                setFilter({ any: true, active: false, finished: false, summary: false })
              }
            >
              Show All Sessions
            </button>
            <button
              className={`${filter.active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
              onClick={() => setFilter({ any: false, active: true, finished: false, summary: false })}
            >
              Only Active Sessions
            </button>
            <button
              className={`${filter.finished ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2`}
              onClick={() => setFilter({ any: false, active: false, finished: true, summary: false })}
            >
              Only Finished Sessions
            </button>
            <button
              className={`${filter.summary ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-500 hover:bg-gray-600'} text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              onClick={() => setFilter({ any: false, active: false, finished: false, summary: true })}
            >
              Only Sessions with Summary
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 m-10">
            <h2 className="col-span-full text-2xl font-bold mb-4">
              Sessions:
            </h2>
            {Object.entries(accumulated)
              .filter(([_, acc]) => {
                if (filter.any) return true;
                if (filter.active) return acc.active > 0;
                if (filter.finished) return acc.finished > 0 && acc.active === 0;
                if (filter.summary) return acc.summary;
                return false;
              })
              .map(([sessionId, acc]) => {
                return (
                  <Link href={`/session/${sessionId}`} key={sessionId}>
                    <div
                      key={sessionId}
                      className="bg-white shadow-md rounded-lg overflow-hidden transition-transform hover:scale-105 m-2"
                    >
                      <div className="bg-primary text-white p-4">
                        <h3 className="text-lg font-semibold">
                          {acc.topic ? acc.topic : `Session ID: ${sessionId}`}
                        </h3>
                      </div>
                      <div className="p-4">
                        <p className="mb-2">
                          <span className="font-medium">
                            Active Participants:
                          </span>{' '}
                          {acc.active}
                        </p>
                        <p className="mb-2">
                          <span className="font-medium">
                            Finished Participants:
                          </span>{' '}
                          {acc.finished}
                        </p>
                        <p>
                          <span className="font-medium">Summary:</span>{' '}
                          {acc.summary ? 'Available' : 'Empty'}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      );
      setShouldUpdateResult(false);
    }
  }, [accumulated, shouldUpdateResult])


  const handleAll = () => {
    sendApiCall({
      action: 'stats'
    }).then((response) => {
      setApiResult(response);
      console.log("All Sessions: ", response)
      const groupedSessions = response.reduce<GroupedSessions>((acc, session) => {
        if (!acc[session.session_id]) {
          acc[session.session_id] = []
        }
        acc[session.session_id].push(session)
        return acc
      }, {})

      // Add all sessions to the store
      Object.entries(groupedSessions).forEach(([sessionId, sessions]) => {
        let accumulated = accumulateSessionData(sessions)
        setAccumulatedSessions(sessionId, accumulated)
      })
      
      setShouldUpdateResult(true);
    })
  };

  const sendApiCall = async (body: RequestData): Promise<SessionData[]> => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API response:', result);
      return result;
    } catch (error) {
      console.error('Error sending API call:', error);
      throw error;
    }
  };

  return (
    <>
      <div className="flex justify-center">
        <div className="flex flex-col space-y-8">
          <button
            className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={handleStartNewSession}
          >
            Start new session
          </button>
          <button
            className="bg-secondary text-gray-800 py-2 px-4 rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            onClick={handleViewResults}
          >
            View Results
          </button>
          <button
            className="bg-accent text-gray-800 py-2 px-4 rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            onClick={handleAll}
          >
            See all sessions
          </button>
        </div>
      </div>
      <div>
        {resultElement}
      </div>
    </>
  );
}
