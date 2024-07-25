'use client';

import { useSessionStore } from "@/stores/SessionStore";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Sessions } from "utils/types";
import { accumulateSessionData, sendApiCall } from "utils/utils";


export default function DashboardOverview() {
  const [loading, setIsLoading] = useState(true);
  const [resultElement, setResultElement] = useState(<></>);
  const [accumulated, setAccumulatedSessions] = useSessionStore((state) => [
    state.accumulated,
    state.setAccumulatedSessions
  ])
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

  const loadingElement = (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-lg font-semibold text-gray-700">Loading...</span>
    </div>
  );

  // Fetch Data when Page loads:
  useEffect(() => {
    console.log("Fetching data on page load...")
    if (!accumulated || Object.keys(accumulated).length === 0) {
      console.log("No data in store, fetching...")
      sendApiCall({
        action: 'stats'
      }).then((response: Sessions) => {
        console.log("All Sessions: ", response)
        const groupedSessions = response.reduce<Record<string, Sessions>>((acc, session) => {
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
          setIsLoading(false);
        })
    
        setShouldUpdateResult(true);
      })
    } else {
      console.log(`Data found in store: ${accumulated}, not fetching...`)
      setIsLoading(false);
      setShouldUpdateResult(true);
    }
  }, [accumulated, setAccumulatedSessions]);

  // Update Filter Effect:
  useEffect(() => {
    if (shouldUpdateResult && accumulated && Object.keys(accumulated).length > 0) {
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
                  <Link href={`/sessions/${sessionId}`} key={sessionId}>
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
  }, [accumulated, shouldUpdateResult, filter]);

  return (
    <div>
      {loading ? (loadingElement) : (resultElement)}
    </div>
  )
}