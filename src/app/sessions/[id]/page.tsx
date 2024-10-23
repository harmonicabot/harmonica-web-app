'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';

import {
  accumulateSessionData,
  sendApiCall,
  sendCallToMake,
} from '@/lib/utils';
import { ApiAction, ApiTarget, UserSessionData } from '@/lib/types';

import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResults from '@/components/SessionResult/SessionResults';

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const [userData, setUserData] = useState<UserSessionData[]>([]);
  const [accumulated, setAccumulated] = useSessionStore((state) => [
    state.accumulated[id],
    state.addAccumulatedSessions,
  ]);

  const numSessions = userData.filter((user) => user.chat_text).length;
  const [hostType, setHostType] = useState(false);

  useEffect(() => {
    if (!hostType) {
      // Check if the sessionId in cookies matches the current session id
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});

      if (cookies['sessionId'] === id) {
        setHostType(true);
      }
    }
  }, [id, hostType]);

  useEffect(() => {
    if (!hostType) {
      // Check authentication status
      const checkAuth = async () => {
        try {
          const session = await fetch('/api/auth/session').then((res) =>
            res.json(),
          );
          if (session && session.user) {
            setHostType(true);
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
        }
      };

      checkAuth();
    }
  }, [hostType]);

  useEffect(() => {
    if (!accumulated) {
      console.log('No data in store, fetching...');
      // Fetch data from the database if not in store
      fetchSessionData();
    } else {
      console.log('Session data found in store', accumulated);
      setAccumulated(id, accumulated);
    }
  }, [id, accumulated]);

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`);
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.Stats,
      data: {
        session_id: id,
      },
    });
    const allData = accumulateSessionData(data);
    setUserData(data.user_data);
    setAccumulated(id, allData);
  };

  const sendFinalReport = async () => {
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.SendFinalReport,
      data: {
        session_id: id,
      },
    });
    await fetchSessionData();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.CreateSummary,
      data: {
        session_id: id,
        finished: accumulated.session_data.num_finished,
      },
    });
    await fetchSessionData();
  };

  const finishSession = async () => {
    await createSummary();
    await sendFinalReport();
  };

  const handleDelete = async () => {
    console.log(`Deleting session ${id}...`);
    const data = await sendApiCall({
      target: ApiTarget.Session,
      action: ApiAction.DeleteSession,
      data: {
        session_id: id,
      },
    });
    console.log(data);
    window.location.href = '/';
  };

  if (!accumulated) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={accumulated.session_data.topic}
        status={
          accumulated.session_data.finalReportSent
            ? SessionStatus.REPORT_SENT
            : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {!accumulated.session_data.finalReportSent && hostType && (
          <SessionResultControls
            id={id}
            isFinished={accumulated.session_data.finalReportSent}
            onFinishSession={finishSession}
          />
        )}
        <SessionResultStatus
          finalReportSent={accumulated.session_data.finalReportSent}
          startTime={accumulated.session_data.start_time}
          numSessions={userData.length}
          activeSessions={numSessions}
        />
        {!accumulated.session_data.finalReportSent && (
          <SessionResultShare sessionId={accumulated.session_data.session_id} />
        )}
      </div>
      <SessionResults
        hostType={hostType}
        userData={userData}
        accumulated={accumulated}
        id={id}
        handleCreateSummary={createSummary}
      />
    </div>
  );
}
