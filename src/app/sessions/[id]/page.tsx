'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import Markdown from 'react-markdown';
import { accumulateSessionData, sendCallToMake } from 'utils/utils';

export default function DashboardIndividual() {
  const { id } = useParams() as { id: string };
  const [loadSummary, setLoadSummary] = useState(false)
  const [accumulated, setAccumulated] = useSessionStore((state) => [
      state.accumulated[id],
      state.addAccumulatedSessions,
    ]);

  useEffect(() => {
    console.log('useEffect triggered to fetch session data for ', id);
    if (!accumulated) {
      console.log('No data in store, fetching...');
      // Fetch data from the database if not in store
      fetchSessionData();
    } else {
      console.log('Session data found in store', accumulated);
    }
  }, [id, accumulated]);

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`);
    const data = await sendCallToMake({
      action: 'stats',
      data: {
        session_id: id,
      },
    });

    setAccumulated(id, accumulateSessionData(data));
  };

  const sendFinalReport = async () => {
    const data = await sendCallToMake({
      action: 'send final report',
      data: {
        session_id: id,
      },
    });
    await fetchSessionData();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    setLoadSummary(true)
    const data = await sendCallToMake({
      action: 'create summary',
      data: {
        session_id: id,
        finished: accumulated.session_data.finished,
      },
    });
    await fetchSessionData();
  };

  useEffect(() => {
    if (accumulated?.session_data.summary) {
      setLoadSummary(false);
    }
  }, [accumulated?.session_data.summary]);

  const handleDelete = async () => {
    console.log(`Deleting session ${id}...`);
    const data = await sendCallToMake({
      action: 'delete',
      data: {
        session_id: id,
      },
    });
    console.log(data);
    window.location.href = '/';
  };

  if (!accumulated) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Session ID: {id}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">All Participants</h2>
          <p className="text-3xl font-bold">
            {accumulated.session_data.num_sessions}
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Active Participants</h2>
          <p className="text-3xl font-bold">
            {accumulated.session_data.active}
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Template</h2>
          <p className="text-3xl font-bold">
            {accumulated.session_data.template || 'N/A'}
          </p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Summary Available</h2>
          <p className="text-3xl font-bold">
            {accumulated.session_data.summary ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        {accumulated.session_data.summary ? (
          <>
            <Markdown>{accumulated.session_data.summary}</Markdown>          
          </>
        ) : (
          <>
          {loadSummary ? (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <button
              className='bg-yellow-300 px-4 py-2 rounded hover:bg-yellow-400 transition-colors'
              onClick={createSummary}
            >
              Create Summary
            </button>
          )}
        </>
        )}
      </div>
      <div className="m-6">
        <button className="bg-yellow-300" onClick={handleDelete}>
          Delete
        </button>
        {accumulated.session_data.summary ? (
          accumulated.session_data.finalReportSent ? (
            <p>Final report has been sent</p>
          ) : (
            <button className="ms-4 bg-yellow-300" onClick={sendFinalReport}>
              Send final report
            </button>
          )
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
