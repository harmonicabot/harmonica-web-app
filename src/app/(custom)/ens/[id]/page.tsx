import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { getUserStats } from '@/lib/clientUtils';
import { decryptId } from '@/lib/encryptionUtils';
import * as db from '@/lib/db';
import ErrorPage from '@/components/Error';

// Similar to original page.tsx but with simplified props
/**
 * Renders the simplified session result page for a specific session identified by the provided `id` parameter.
 *
 * This component fetches the necessary data from the database, including the host session details, user data, and message statistics. It then renders the session result header, overview, and results section components with the fetched data.
 *
 * If an error occurs during the data fetching process, an error page is rendered instead.
 *
 * @param params - An object containing the `id` parameter, which is used to fetch the session data.
 * @returns A React component that renders the simplified session result page.
 */
export default async function SimplifiedSessionResult({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const decryptedId = decryptId(id);

  try {
    const hostData = await db.getHostSessionById(decryptedId);
    const userData = await db.getUsersBySessionId(decryptedId);
    const stats = await db.getNumUsersAndMessages([hostData.id]);
    const usersWithChat = userData.filter(
      (user) => stats[decryptedId][user.id].num_messages > 2
    );
    const { totalUsers, finishedUsers } = getUserStats(stats, decryptedId);

    return (
      <div className="p-4 md:p-8">
        <SessionResultHeader
          topic={hostData.topic}
          status={
            !hostData.active ? SessionStatus.REPORT_SENT : SessionStatus.ACTIVE
          }
        />
        <SessionResultsOverview
          id={hostData.id}
          active={hostData.active}
          startTime={hostData.start_time}
          numSessions={totalUsers}
          completedSessions={finishedUsers}
          showShare={false} // Disable share feature
        />
        <SessionResultsSection
          hostData={hostData}
          userData={usersWithChat}
          id={hostData.id}
          showParticipants={false} // Disable participants table
          showShare={false} // Disable share feature
          showSessionRecap={false}
          chatEntryMessage={{
            role: 'assistant',
            content: `Welcome to the ENS AI Summit! I'm here to help you understand the insights from past discussions.
          
Here are some questions you might want to ask:
  - What were the key themes discussed across sessions?
  - How did participants view AI's role in education?
  - What were the main concerns about AI adoption?
`,
          }}
        />
      </div>
    );
  } catch (error) {
    console.error(`Error occurred fetching data: `, error);
    return (
      <ErrorPage
        title={'Error loading sessions'}
        message={'One or more sessions could not be loaded.'}
      />
    );
  }
}
