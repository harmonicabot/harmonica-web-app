'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import Markdown from 'react-markdown'
import { accumulateSessionData, sendApiCall } from 'utils/utils';

export default function DashboardIndividual() {
  const { id } = useParams() as { id: string };

  const [accumulated, setAccumulated] = useSessionStore(
    (state) => [
      state.accumulated[id],
      state.setAccumulatedSessions
    ]
  )

  useEffect(() => {
    console.log("useEffect triggered to fetch session data for ", id)
    if (!accumulated) {
      console.log("No data in store, fetching...")
      // Fetch data from the database if not in store
      fetchSessionData()
    } else {
      console.log("Session data found in store")
    }
  }, [id, accumulated])

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`)
    const data = await sendApiCall({
      action: "stats",
      data: {
        session_id: id,
      },
    })
    
    setAccumulated(id, accumulateSessionData(data))
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`)
    const data = await sendApiCall({
      action: "summary",
      data: {
        session_id: id,
      },
    });
    accumulated.session_data.summary = data;
  };

  const handleDelete = async () => {
    console.log(`Deleting session ${id}...`)
    const data = await sendApiCall({
      action: "delete",
      data: {
        session_id: id,
      },
    });
    console.log(data)
    window.location.href = "/"
  };

  if (!accumulated) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Session ID: {id}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">All Participants</h2>
          <p className="text-3xl font-bold">{accumulated.session_data.num_sessions}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Active Participants</h2>
          <p className="text-3xl font-bold">{accumulated.session_data.active}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Template</h2>
          <p className="text-3xl font-bold">{accumulated.session_data.template || 'N/A'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Summary Available</h2>
          <p className="text-3xl font-bold">{accumulated.session_data.summary ? 'Yes' : 'No'}</p>
        </div>
      </div>
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        {accumulated.session_data.summary ? (
          <Markdown>{accumulated.session_data.summary}</Markdown>          
        ) : (
          <button
            className='bg-yellow-300'
            onClick={createSummary}
          >
            Create
          </button>
        )}
      </div>
      <div className='m-6'>
        <button className='bg-yellow-300'
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
