'use client';

import { useParams } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import { useUser } from '@auth0/nextjs-auth0/client';
import * as gpt from 'app/api/gptUtils';
import * as db from '@/lib/db';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultControls from '@/components/SessionResult/SessionResultControls';
import SessionResultStatus from '@/components/SessionResult/SessionResultStatus';
import SessionResultShare from '@/components/SessionResult/SessionResultShare';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { decryptId } from '@/lib/encryptionUtils';
import { Message, UserSession } from '@/lib/schema_updated';
import ErrorPage from '@/components/Error';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds

// Define the type for the grouped chats
interface GroupedChats {
  [threadId: string]: Message[];
}

const fetcher = async (id: string) => {
  console.log('Updating session data...');
  const hostData = await db.getHostSessionById(id);
  const userData = await db.getUsersBySessionId(id);
  return { hostData, userData };
};

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const decryptedId = decryptId(id);

  const [sessionsWithChat, setSessionsWithChat] = useState<UserSession[]>([]);
  const [numSessions, setNumSessions] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);

  const [hostData, addHostData, userData = [], addUserData] = useSessionStore(
    (state) => [
      state.hostData[decryptedId],
      state.addHostData,
      state.userData[id],
      state.addUserData,
    ]
  );

  const processUserData = async (userData: UserSession[]) => {
    if (!userData) return;
    db.filterForUsersWithMessages(userData).then((usersWithMessages) => {
      setSessionsWithChat(usersWithMessages);
      setNumSessions(usersWithMessages.length);
      setCompletedSessions(
        usersWithMessages.filter((user) => !user.active).length
      );
    });
  };

  const { error } = useSWR(
    `sessions/${decryptedId}`,
    () => fetcher(decryptedId),
    {
      refreshInterval: 5 * 60000, // Poll every 5 minutes
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      errorRetryCount: 0,
      onSuccess: ({ hostData, userData }) => {
        console.log('Updated session data fetched:', userData);
        if (hostData) {
          addHostData(decryptedId, hostData);
        }
        if (userData) {
          addUserData(id, userData);
          processUserData(userData);
        }
      },
    }
  );

  const finishSession = async () => {
    await db.deactivateHostSession(decryptedId);
    await createSummary();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${decryptedId}...`);
    const chats = await db.getAllMessagesForUsersSorted(sessionsWithChat);

    // Flatten the chats and group by thread_id to distinguish participants
    const groupedChats: GroupedChats = chats.reduce((acc, chat) => {
      const participant = chat.thread_id; // Use thread_id to identify the participant
      if (!acc[participant]) {
        acc[participant] = [];
      }
      acc[participant].push(chat);
      return acc;
    }, {} as GroupedChats); // Type assertion for the accumulator

    // Create formatted messages for each participant
    const chatMessages = Object.entries(groupedChats).map(
      ([participantId, messages]) => {
        const participantMessages = messages
          .map((chat) => {
            return `${chat.role === 'user' ? 'User' : 'AI'}: ${chat.content}`;
          })
          .join(`\n----END Participant ${participantId}----\n`); // Join messages for the same participant
        return `\`\`\`\n----START Participant ${participantId}:----\n${participantMessages}\n\`\`\``; // Format for each participant
      }
    );

    const promptForObjective = `\`\`\`This is the original session prompt, it _contains_ the **OBJECTIVE** somewhere in its body.\n
    Look for the objective, and format the report to address the objective found in this prompt.\n\n
    ----START PROMPT----\n
    ${hostData.prompt}
    \n----END PROMPT----\n\`\`\``;
    console.log('Sending chat history to GPT-4: ', chatMessages);
    const threadId = await gpt.handleCreateThread(
      {
        role: 'assistant',
        content: 'Use the following messages as context for user input.',
      },
      [...chatMessages, promptForObjective]
    );
    const summaryReply = await gpt.handleGenerateAnswer({
      threadId: threadId,
      assistantId:
        process.env.SUMMARY_ASSISTANT ?? 'asst_QTmamFSqEIcbUX4ZwrjEqdm8',
      messageText:
        'Generate the report based on the participant data provided addressing the objective.',
    });
    const summary = summaryReply.content;
    console.log('Summary: ', summary);

    await db.updateHostSession(decryptedId, {
      summary: summary ?? undefined,
      last_edit: new Date(),
    });
    mutate(`sessions/${decryptedId}`);
  };

  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    if (!hostData) return;
    console.log('Checking for new messages...');
    const lastMessage = userData.reduce((latest, user) => {
      const messageTime = new Date(user.last_edit).getTime();
      return messageTime > latest ? messageTime : latest;
    }, 0);
    console.log('Last message:', lastMessage);
    console.log('Last summary update:', hostData);
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

  if (error) {
    console.error(`Error occured fetching data: `, error);
    return (
      <ErrorPage title={"Error loading session"} message={"The session ID might be incorrect or the session may no longer exist."}/>
    );
  }

  if (!hostData) return <div>Loading...</div>;

  return (
    <div className="p-4 md:p-8">
      <SessionResultHeader
        topic={hostData.topic}
        status={
          !hostData.active ? SessionStatus.REPORT_SENT : SessionStatus.ACTIVE
        }
      />
      <div className="flex flex-col md:flex-row gap-4">
        {hostData.active && (
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
        {hostData.active && <SessionResultShare sessionId={decryptedId} />}
      </div>
      <SessionResultsSection
        hostData={hostData}
        userData={sessionsWithChat}
        id={decryptedId}
        handleCreateSummary={createSummary}
        hasNewMessages={hasNewMessages}
      />
    </div>
  );
}
