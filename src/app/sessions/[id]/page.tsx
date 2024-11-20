'use client';

import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getGPTCompletion } from 'app/api/gptUtils';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResults from '@/components/SessionResult/SessionResults';
import {
  countChatMessages,
  deactivateHostSession,
  getAllChatMessagesInOrder,
  getFromHostSession,
  getHostSessionById,
  getUsersBySessionId,
  updateHostSession,
} from '@/lib/db';
import { decryptId } from '@/lib/encryptionUtils';

const fetcher = async (id: string) => {
  const hostData = await getHostSessionById(id);
  const userData = await getUsersBySessionId(id);
  return { hostData, userData };
};

export default async function SessionResult() {
  const { id } = useParams() as { id: string };
  const decryptedId = decryptId(id);

  const [hostData, addHostData, userData, addUserData] = useSessionStore((state) => [
    state.hostData[decryptedId],
    state.addHostData,
    state.userData[id],
    state.addUserData,
  ]);


  const { error } = useSWR(`sessions/${decryptedId}`, () => fetcher(decryptedId), {
    refreshInterval: 60000, // Poll every 60 seconds
    revalidateOnFocus: true,
    onSuccess: ({ hostData, userData }) => {
      console.log('Updated session data fetched:', userData);
      addHostData(decryptedId, hostData)
      addUserData(id, userData);
    },
  });

  const { user } = useUser();

  const sessionsWithChatText = await Promise.all(
    userData.map(async (user) => {
      const messageCount = await countChatMessages(user.thread_id);
      return { user, messageCount };
    })
  ).then((results) =>
    results
      .filter(({ messageCount }) => messageCount > 1)
      .map(({ user }) => user)
  );

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
    const chats = await Promise.all(
      sessionsWithChatText.map(
        async (user) => await getAllChatMessagesInOrder(user.thread_id)
      )
    );
    const prompt = await getFromHostSession(id, 'prompt')

    // TODO: The chat messages here are not concatenated properly yet, AND we want to pass them individually to chatGPT instead of all at once, otherwise it might fail due to size limitations.
    const instructions = `
Generate a short **REPORT** that answers the OBJECTIVE of the session and suits the overall session style.\n\n
The **OBJECTIVE** is stated in this prompt:\n
##### PROMPT #####\n
${prompt}\n
##### PROMPT #####\n
And the content for the report:\n\n
##### Next Participant: #####\n
${chats.join('##### Next Participant: #####\n')}
`;
    const summary = await getGPTCompletion(instructions);
    console.log('Summary: ', summary);

    // So that we don't have to re-fetch all data from the DB, we just update the summary in the store directly
    updateHostSession(decryptedId, {
      summary: summary ?? undefined,
      last_edit: new Date(),
    }).then(() => mutate(`sessions/${id}`));
  };

  const [hasNewMessages, setHasNewMessages] = useState(false);
  useEffect(() => {
    const lastMessage = Math.max(
      ...userData.map((u) => new Date(u.last_edit).getTime())
    );
    const lastSummaryUpdate = hostData.last_edit.getTime();
    const hasNewMessages = lastMessage > lastSummaryUpdate;
    setHasNewMessages(hasNewMessages);

    if (
      hasNewMessages &&
      lastMessage > lastSummaryUpdate &&
      new Date().getTime() - lastSummaryUpdate > 1000 * 60 * 10
    ) {
      const minutesAgo =
        (new Date().getTime() - lastSummaryUpdate) / (1000 * 60);
      console.log(`Last summary created ${minutesAgo} minutes ago, 
        and new messages were received since then. Creating an updated one.`);
      createSummary();
    }
  }, [hostData]);

  // if (error) return <div>{`Failed to load session data :-(`}</div>;
  if (!hostData) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={hostData.topic}
        status={
          !hostData.active
            ? SessionStatus.REPORT_SENT
            : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {hostData.active && hostType && (
          <SessionResultControls
            id={decryptedId}
            isFinished={!hostData.active}
            finishSession={finishSession}
            createSummary={createSummary}
            readyToGetSummary={numSessions > 0}
          />
        )}
        <SessionResultStatus
          finalReportSent={!hostData.active}
          startTime={hostData.start_time}
          numSessions={numSessions}
          completedSessions={completedSessions}
        />
        {hostData.active && (
          <SessionResultShare sessionId={decryptedId} />
        )}
      </div>
      <SessionResults
        hostType={hostType}
        hostData={hostData}
        userData={sessionsWithChatText}
        id={decryptedId}
        handleCreateSummary={createSummary}
        hasNewMessages={hasNewMessages}
      />
    </div>
  );
}
