'use client';

import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getGPTCompletion } from 'app/api/gptUtils';
import { UserSession } from '@/lib/schema';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResults from '@/components/SessionResult/SessionResults';
import { deactivateHostSession, getHostAndAssociatedUserSessions, updateHostSession } from '@/lib/db';
import { decryptId } from '@/lib/encryptionUtils';

const fetcher = async (id: string) => {
  const data = await getHostAndAssociatedUserSessions(id);
  return data;
};

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const decryptedId = decryptId(id);
  const [userData, setUserData] = useState<UserSession[]>([]);
  const [sessionData, setSessionData] = useSessionStore((state) => [
    state.allSessionData[decryptedId],
    state.addSession,
  ]);

  const { error } = useSWR(`sessions/${decryptedId}`, () => fetcher(decryptedId), {
    refreshInterval: 60000, // Poll every 60 seconds
    revalidateOnFocus: true,
    onSuccess: (data) => {
      console.log('Updated session data fetched:', data);
      setUserData(Object.values(data.user_data));
      setSessionData(decryptedId, data);
    },
  });

  const { user } = useUser();
  const sessionsWithChatText = userData.filter((user) => user.chat_text);
  const numSessions = sessionsWithChatText.length;
  const completedSessions = sessionsWithChatText.filter(
    (user) => !user.active
  ).length;

  const [hostType, setHostType] = useState(false);


  const finishSession = async () => { 
    await deactivateHostSession(decryptedId);
    await createSummary();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${decryptedId}...`);
    const chats = Object.values(sessionData.user_data)
      .map((userData) => userData.chat_text)
      .filter(Boolean);

    const instructions = `
Generate a short **REPORT** that answers the OBJECTIVE of the session and suits the overall session style.\n\n
The **OBJECTIVE** is stated in this prompt:\n
##### PROMPT #####\n
${sessionData.host_data.prompt}\n
##### PROMPT #####\n
And the content for the report:\n\n
##### Next Participant: #####\n
${chats.join('##### Next Participant: #####\n')}
`;
    const summary = await getGPTCompletion(instructions);
    console.log('Summary: ', summary);

    // So that we don't have to re-fetch all data from the DB, we just update the summary in the store directly
    updateHostSession(decryptedId, { summary: summary ?? undefined, last_edit: new Date() }).then(() =>
      mutate(`sessions/${id}`)
    );
  };

  const [hasNewMessages, setHasNewMessages] = useState(false);
  useEffect(() => {
    const lastMessage = Math.max(...userData.map(u => new Date(u.last_edit).getTime()));
    const lastSummaryUpdate = sessionData?.host_data.last_edit.getTime(); 
    const hasNewMessages = lastMessage > lastSummaryUpdate;
    setHasNewMessages(hasNewMessages);

    if (hasNewMessages && lastMessage > lastSummaryUpdate && new Date().getTime() - lastSummaryUpdate > (1000 * 60 * 10)) {
      const minutesAgo = (new Date().getTime() - lastSummaryUpdate) / (1000 * 60)
      console.log(`Last summary created ${minutesAgo} minutes ago, 
        and new messages were received since then. Creating an updated one.`)
      createSummary();
    } 
  }, [sessionData]);

  // if (error) return <div>{`Failed to load session data :-(`}</div>;
  if (!sessionData) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={sessionData.host_data.topic}
        status={
          !sessionData.host_data.active
            ? SessionStatus.REPORT_SENT
            : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {sessionData.host_data.active && hostType && (
          <SessionResultControls
            id={decryptedId}
            isFinished={!sessionData.host_data.active}
            finishSession={finishSession}
            createSummary={createSummary}
            readyToGetSummary={numSessions > 0}
          />
        )}
        <SessionResultStatus
          finalReportSent={!sessionData.host_data.active}
          startTime={sessionData.host_data.start_time}
          numSessions={numSessions}
          completedSessions={completedSessions}
        />
        {sessionData.host_data.active && (
          <SessionResultShare sessionId={decryptedId} />
        )}
      </div>
      <SessionResults
        hostType={hostType}
        userData={userData}
        allData={sessionData}
        id={decryptedId}
        handleCreateSummary={createSummary}
        hasNewMessages={hasNewMessages}
      />
    </div>
  );
}
