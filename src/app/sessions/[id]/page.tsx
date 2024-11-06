'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { useUser } from '@auth0/nextjs-auth0/client';

import {
  accumulateSessionData,
  sendApiCall,
  sendCallToMake,
} from '@/lib/utils';
import {
  ApiAction,
  ApiTarget,
  RawSessionData,
  UserSessionData,
} from '@/lib/types';

import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResults from '@/components/SessionResult/SessionResults';
import {
  getHostAndUserSessions,
  getHostSessionById,
  searchUserSessions,
  updateHostSession,
} from '@/lib/db';
import { HostSession } from '@/lib/schema';
import { generateAnswer } from 'app/api/gptUtils';

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const [userData, setUserData] = useState<UserSessionData[]>([]);
  const [accumulated, setAccumulated] = useSessionStore((state) => [
    state.accumulated[id],
    state.addAccumulatedSessions,
  ]);

  const { user } = useUser();

  console.log('Type of userData: ', typeof userData, ' UserData: ', userData);
  const numSessions = userData.filter((user) => user.chat_text).length;
  const completedSessions = userData.filter((user) => !user.active).length;

  const [hostType, setHostType] = useState(false);

  useEffect(() => {
    if (!hostType) {
      // Check if the sessionId in cookies matches the current session id
      const cookies = document.cookie
        .split(';')
        .reduce<Record<string, string>>((acc, cookie) => {
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
    if (!hostType && user && user.sub) {
      setHostType(true);
    }
  }, [user]);

  useEffect(() => {
    if (!accumulated) {
      console.log('No data in store, fetching...');
      // Fetch data from the database if not in store
      fetchSessionData();
    } else {
      console.log('Session data found in store, not fetching');
      setAccumulated(id, accumulated);
      setUserData(Object.values(accumulated.user_data)); // Convert to array
    }
  }, [id, accumulated]);

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`);
    const data: RawSessionData = await fetchFromDb();
    const allData = accumulateSessionData(data);
    setUserData(Object.values(data.user_data));
    setAccumulated(id, allData);
  };

  async function fetchFromDb(): Promise<RawSessionData> {
    // This is for now duplicating functionality in api/session
    const hostSession: HostSession = (await getHostSessionById(id))[0];
    const userSessions = await searchUserSessions('session_id', id);
    const userSessionsRecord = userSessions.reduce<
      Record<string, UserSessionData>
    >((acc, session) => {
      acc[session.id] = {
        ...session,
        feedback: session.feedback ?? undefined,
        chat_text: session.chat_text ?? undefined,
        result_text: session.result_text ?? undefined,
        bot_id: session.bot_id ?? undefined,
        host_chat_id: session.host_chat_id ?? undefined,
      };
      return acc;
    }, {});
    return {
      session_data: hostSession,
      user_data: userSessionsRecord,
    };
  }

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    // Todo: do we want to update accumulated from the DB first, to make sure we have the latest data?
    // Either way, we will need to have some mechanism so specify which chat-texts were included in the summary.
    // One possibility would be to use timestamps, when the summary was created
    // and compare with timestamps of the last chat text update.
    // But that then would only work reliably if we DO update accumulated first; otherwise the summary might have been created with an outdated set of chats and we wouldn't know about that.
    // ... unless we set a timestamp not of _now_ (i.e. when the summary is created) but of when accumulated was last updated...?
    await fetchSessionData();

    const chats = Object.values(accumulated.user_data)
      .map((userData) => userData.chat_text)
      .filter(Boolean);

    const instructions = `
Generate a short report of the session based on the following chat history:
##### Next Participant: #####\n
${chats.join('##### Next Participant: #####\n')}
`;
    const assistantId = 'asst_cR68xq45nPJVVDPA32lAx1R0';
    const summary = await generateAnswer(instructions, assistantId);

    updateHostSession(id, {summary});
  };

  const finishSession = async () => {
    await createSummary();
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
          accumulated.session_data.final_report_sent
            ? SessionStatus.REPORT_SENT
            : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {!accumulated.session_data.final_report_sent && hostType && (
          <SessionResultControls
            id={id}
            isFinished={accumulated.session_data.final_report_sent}
            onFinishSession={finishSession}
            onCreateSummary={createSummary}
            readyToGetSummary={numSessions > 0}
          />
        )}
        <SessionResultStatus
          finalReportSent={accumulated.session_data.final_report_sent}
          startTime={accumulated.session_data.start_time}
          numSessions={numSessions}
          completedSessions={completedSessions}
        />
        {!accumulated.session_data.final_report_sent && (
          <SessionResultShare sessionId={accumulated.session_data.id} />
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
