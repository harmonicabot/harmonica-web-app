'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SessionData } from '../../home/page';
import { useSessionStore } from '@/stores/SessionStore';
import Markdown from 'react-markdown'

type AccumulatedSessionData = {
  num_sessions: number;
  active: number;
  finished: number;
  summary: string;
  template: string;
  topic: string;
  context: string;
};

export default function Dashboard() {
  const { id } = useParams() as { id: string };
  const [sessionData, setSessionData] = useState<AccumulatedSessionData>();

  const existingSessionData = useSessionStore(
    (state) => state.sessions[id]
  )

  function accumulateSessionData(data: SessionData[]) {
    const accumulated: AccumulatedSessionData = {
      num_sessions: data.length,
      active: 0,
      finished: 0,
      summary: '',
      template: '',
      topic: '',
      context: '',
    }

    console.log("SessionData being accumulated: ", data)
    data.forEach((session) => {
      accumulated.active += session.active ? 1 : 0
      accumulated.finished += session.active ? 0 : 1
      accumulated.summary = session.result_text || accumulated.summary
      accumulated.template = session.template || accumulated.template
      accumulated.topic = session.topic || accumulated.topic
      accumulated.context = session.context || accumulated.context
    })

    setSessionData(accumulated)

  }

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`)
    const response = await fetch(`/api/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      body: JSON.stringify(
        {
          action: "stats",
          data: {
            session_id: id,
          },
        })
    });
    const data = await response.json();
    accumulateSessionData(data)
  };

  useEffect(() => {
    if (!existingSessionData) {
      // Fetch data from the database if not in store
      fetchSessionData()
    } else {
      console.log("Session data found in store")
      accumulateSessionData(existingSessionData)
    }
  }, [id, existingSessionData])
  
  if (!sessionData) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Session ID: {id}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">All Participants</h2>
          <p className="text-3xl font-bold">{sessionData.num_sessions}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Active Participants</h2>
          <p className="text-3xl font-bold">{sessionData.active}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Template</h2>
          <p className="text-3xl font-bold">{sessionData.template || 'N/A'}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Summary Available</h2>
          <p className="text-3xl font-bold">{sessionData.summary ? 'Yes' : 'No'}</p>
        </div>
      </div>
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <Markdown>{sessionData.summary || 'No result available'}</Markdown>
      </div>
    </div>
  );
}
