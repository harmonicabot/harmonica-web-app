'use client';

import { useSessionStore } from '@/stores/SessionStore';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  RawSessionData,
  RawSessionOverview,
  UserSessionData,
} from 'utils/types';
import { accumulateSessionData, sendCallToMake } from 'utils/utils';

/**
 * The `DashboardOverview` component is responsible for rendering the dashboard overview page. It fetches session data from an API and displays it in a grid layout, with filtering options to show all sessions, only active sessions, only finished sessions, or only sessions with a summary.
 *
 * The component uses the `useSessionStore` hook to manage the state of the accumulated session data, and the `useState` and `useEffect` hooks to handle loading, filtering, and rendering the session data.
 *
 * The component renders a loading spinner while the data is being fetched, and then displays the session data in a grid layout with various filtering options.
 *
 * @returns {JSX.Element} The rendered `DashboardOverview` component.
 */
export default function DashboardOverview() {
  const [loading, setIsLoading] = useState(true);
  const [resultElement, setResultElement] = useState(<></>);
  const [selectedSessions, setSelectedSessions] = useState({});
  const [accumulated, addAccumulatedSessions, removeAccumulatedSessions] =
    useSessionStore((state) => [
      state.accumulated,
      state.addAccumulatedSessions,
      state.removeAccumulatedSessions,
    ]);
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
      <span className="ml-3 text-lg font-semibold text-gray-700">
        Loading...
      </span>
    </div>
  );

  // Fetch Data when Page loads:
  useEffect(() => {
    console.log('Fetching data on page load...');
    if (!accumulated || Object.keys(accumulated).length === 0) {
      fetchUserAndSessionData();
    } else {
      console.log(`Data found in store, not fetching...`);
    }
    setIsLoading(false);
  }, [accumulated, addAccumulatedSessions]);

  async function fetchUserAndSessionData() {
    const response = await fetch('/api/sessions');
    if (!response.ok) {
      console.error(
        'Network response was not ok: ',
        response.status,
        response.text
      );
      return null;
    }
    const data = await response.json();
    console.log('Data fetched from API:', data);
    return parseDbItems(data.userData, data.sessionData);
  }

  type DbResponse = {
    records: Records[];
  };

  type Records = {
    key: string;
    data: UserSessionData | RawSessionOverview;
  };

  function parseDbItems(userData: DbResponse, sessionData: DbResponse) {
    sessionData.records.forEach((record) => {
      let entry: RawSessionData = {
        session_data: record.data as RawSessionOverview,
        user_data: userData.records.reduce((acc, userRecord) => {
          const uData = userRecord.data as UserSessionData;
          if (uData.session_id === record.key) {
            console.log(`UserData found for session ${record.key}:`, uData);
            acc[userRecord.key] = uData;
          }
          return acc;
        }, {} as Record<string, UserSessionData>),
      };
      console.log(`Accumulating session data for ${record.key}:`, entry);
      const accumulated = accumulateSessionData(entry);
      addAccumulatedSessions(record.key, accumulated);
    });
  }

  const toggleSessionSelection = (sessionId: string) => {
    console.log('Adding session to selection:', sessionId);
    console.log('Selection before updating:', selectedSessions);
    setSelectedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
    console.log('Selection after updating: ', selectedSessions);
  };

  const handleDeleteSelected = async () => {
    // Show confirmation modal
    const hostIds = Object.keys(selectedSessions).filter(
      (id) => selectedSessions[id]
    );
    // Before we can delete from the user store, we need to filter the entries that have the session_id and get their keys...
    const userIds = Object.values(accumulated).flatMap((data) =>
      Object.entries(data.user_data)
        .filter(([_, userSessionData]) =>
          hostIds.includes(userSessionData.session_id)
        )
        .map(([id, _]) => id)
    );

    if (confirm(`Are you sure you want to delete these user entries? \n\n${userIds.join('\n')}`)
      &&confirm(`Are you sure you want to delete these host entries? \n\n${hostIds.join('\n')}`)
    ) {
      console.log(`Deleting ${userIds} from user db...`);

      let response = await fetch('api/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: userIds, database: 'user' }),
      });

      if (!response.ok) {
        console.error(
          'There was a problem deleting ids:',
          response.status,
          response.statusText
        );
        return;
      }
      console.log(`Deleted ${userIds} from user db...: ${await response.text()}`);

      console.log(`Deleting ${hostIds} from host db...`);
      response = await fetch('api/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: hostIds, database: 'session' }),
      });

      if (!response.ok) {
        console.error(
          'There was a problem deleting ids:',
          response.status,
          response.statusText
        );
        return;
      }

      console.log(`Deleted ${hostIds} from host db...: ${await response.text()}`);

      hostIds.forEach((sessionId) => {
        removeAccumulatedSessions(sessionId);
      });

      // Clear selected sessions
      setSelectedSessions({});
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    // setShouldUpdateResult(true);
  };

  // Update Filter Effect:
  useEffect(() => {
    if (accumulated && Object.keys(accumulated).length > 0) {
      setResultElement(
        <div>
          <div className="flex justify-center space-x-4 mt-6 mb-6">
            <button
              className={`${
                filter.any
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              onClick={() =>
                setFilter({
                  any: true,
                  active: false,
                  finished: false,
                  summary: false,
                })
              }
            >
              Show All Sessions
            </button>
            <button
              className={`${
                filter.active
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
              onClick={() =>
                setFilter({
                  any: false,
                  active: true,
                  finished: false,
                  summary: false,
                })
              }
            >
              Only Active Sessions
            </button>
            <button
              className={`${
                filter.finished
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2`}
              onClick={() =>
                setFilter({
                  any: false,
                  active: false,
                  finished: true,
                  summary: false,
                })
              }
            >
              Only Finished Sessions
            </button>
            <button
              className={`${
                filter.summary
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              } text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
              onClick={() =>
                setFilter({
                  any: false,
                  active: false,
                  finished: false,
                  summary: true,
                })
              }
            >
              Only Sessions with Summary
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 m-10">
            <h2 className="col-span-full text-2xl font-bold mb-4">Sessions:</h2>
            {Object.entries(accumulated)
              .filter(([_, acc]) => {
                if (filter.any) return true;
                if (filter.active) return acc.session_data.active > 0;
                if (filter.finished)
                  return (
                    acc.session_data.finished > 0 &&
                    acc.session_data.active === 0
                  );
                if (filter.summary) return acc.session_data.summary;
                return false;
              })
              .map(([sessionId, accumulatedSess]) => {
                return (
                  <Link href={`/sessions/${sessionId}`} key={sessionId}>
                    <div
                      key={sessionId}
                      className="bg-white shadow-md rounded-lg overflow-hidden transition-transform hover:scale-105 m-2 relative"
                    >
                      <input
                        type="checkbox"
                        className="absolute top-2 right-2 z-10 w-6 h-6 cursor-pointer"
                        checked={!!selectedSessions[sessionId]}
                        onChange={() => toggleSessionSelection(sessionId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="bg-primary text-white p-4">
                        <h3 className="text-lg font-semibold">
                          {accumulatedSess.session_data.topic ||
                            `Session ID: ${sessionId}` +
                              (accumulatedSess.session_data.template
                                ? ` - ${accumulatedSess.session_data.template}`
                                : '')}
                        </h3>
                      </div>
                      <div className="p-4">
                        <p className="mb-2">
                          <span className="font-medium">
                            Active Participants:
                          </span>{' '}
                          {accumulatedSess.session_data.active}
                        </p>
                        <p className="mb-2">
                          <span className="font-medium">
                            Finished Participants:
                          </span>{' '}
                          {accumulatedSess.session_data.finished}
                        </p>
                        <p>
                          <span className="font-medium">Summary:</span>{' '}
                          {accumulatedSess.session_data.summary
                            ? 'Available'
                            : 'Empty'}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
          {Object.values(selectedSessions).some(Boolean) && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Selected Sessions:</h2>
              <button
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md"
                onClick={handleDeleteSelected}
                disabled={
                  Object.values(selectedSessions).some(Boolean) === false
                }
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
      );
    }
  }, [accumulated, filter, selectedSessions]);

  return <div>{loading ? loadingElement : resultElement}</div>;
}
