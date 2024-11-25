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
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import {
  deactivateHostSession,
  getAllChatMessagesInOrder,
  getFromHostSession,
  getHostSessionById,
  getUsersBySessionId,
  filterForUsersWithMessages,
  updateHostSession,
} from '@/lib/db';
import { decryptId } from '@/lib/encryptionUtils';
import { UserSession } from '@/lib/schema_updated';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60;  // in seconds

// Define the type for a chat message
interface ChatMessage {
  content: string;
  created_at: Date;
  id: string;
  role: 'user' | 'ai' | 'assistant'; // Added 'assistant' to the role type
  thread_id: string;
}

// Define the type for the grouped chats
interface GroupedChats {
  [threadId: string]: ChatMessage[];
}

const fetcher = async (id: string) => {
  const hostData = await getHostSessionById(id);
  const userData = await getUsersBySessionId(id);
  console.log('hostData', hostData);
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
    ],
  );

  const { error } = useSWR(
    `sessions/${decryptedId}`,
    () => fetcher(decryptedId),
    {
      refreshInterval: 5 * 60000, // Poll every 5 minutes
      revalidateOnFocus: true,
      onSuccess: ({ hostData, userData }) => {
        console.log('Updated session data fetched:', userData);
        addHostData(decryptedId, hostData);
        addUserData(id, userData);
      },
    },
  );

  const { user } = useUser();

  useEffect(() => {
    const processUserData = async () => {
      if (!userData) return;

      filterForUsersWithMessages(userData)
        .then(usersWithMessages => {
          setSessionsWithChat(usersWithMessages);
          setNumSessions(usersWithMessages.length);
          setCompletedSessions(usersWithMessages.filter((user) => !user.active).length);
        })
    };

    processUserData();
  }, [userData]);

  // const [hostType, setHostType] = useState(false);

  const finishSession = async () => {
    await deactivateHostSession(decryptedId);
    await createSummary();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${decryptedId}...`);
    const chats = await Promise.all(
      sessionsWithChat.map(
        async (user) => await getAllChatMessagesInOrder(user.thread_id),
      ),
    );

    // Flatten the chats and group by thread_id to distinguish participants
    const flattenedChats: ChatMessage[] = chats.flat();
    const groupedChats: GroupedChats = flattenedChats.reduce((acc, chat) => {
      const participant = chat.thread_id; // Use thread_id to identify the participant
      if (!acc[participant]) {
        acc[participant] = [];
      }
      acc[participant].push(chat);
      return acc;
    }, {} as GroupedChats); // Type assertion for the accumulator

    // Create formatted messages for each participant
    const chatMessages = Object.entries(groupedChats).map(([participantId, messages]) => {
      const participantMessages = messages.map(chat => {
        return `${chat.role === 'user' ? 'User' : 'AI'}: ${chat.content}`;
      }).join('\n'); // Join messages for the same participant
      return `Participant ${participantId}:\n${participantMessages}`; // Format for each participant
    }).join('\n\n----- Next Participant: -----\n'); // Join participants

    const instructions = `
Generate a structured **REPORT** based on all participant session transcripts. The report must address the stated **OBJECTIVE** of the session and follow the formatting and style guidance below.
\n
---\n

**OBJECTIVE**: \n
${hostData.prompt}\n
\n
**Participant Data**:\n
${chatMessages}

### Report Structure:\n
\n
1. **Introduction**:\n
   - Briefly restate the session objective and purpose.\n
   - Provide context or background if necessary.\n
\n
2. **Key Themes**:\n
   - Summarize the most common and important points raised by participants.\n
   - Organize responses into clear themes or categories.\n
\n
3. **Divergent Opinions**:\n
   - Highlight significant areas of disagreement or unique insights that deviate from the common themes.\n
    \n
4. **Actionable Insights**:\n
   - Derive clear, actionable recommendations based on participant inputs.\n
   - Where possible, link these recommendations directly to the sessions objective.\n
\n
5. **Conclusion**:\n
   - Summarize the key takeaways and outline any next steps.\n
\n
---

### Style and Tone:\n
\n
- **Professional and Clear**: Use concise and precise language.\n
- **Accessible**: Avoid jargon; ensure readability for a general audience.\n
- **Well-Formatted**: \n
   - Use headers, bullet points, and bold/italic text for clarity and emphasis.\n
   - Include logical breaks between sections for easy navigation.\n
\n
### Additional Notes:\n
\n
- Prioritize recurring themes or insights if participant data is extensive.\n
- Flag any incomplete or conflicting responses for host review.\n
- Ensure that the report ties all findings back to the stated **OBJECTIVE**.\n
\n
---\n

`;
    const summary = await getGPTCompletion(instructions);
    console.log('Summary: ', summary);

    await updateHostSession(decryptedId, {
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
