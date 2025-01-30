import SessionResultHeader, { SessionStatus } from "@/components/SessionResult/SessionResultHeader";
import SessionResultsOverview from "@/components/SessionResult/SessionResultsOverview";
import SessionResultsSection from "@/components/SessionResult/SessionResultsSection";
import { getUserStats } from "@/lib/clientUtils";
import { decryptId } from "@/lib/encryptionUtils";
import * as db from '@/lib/db';
import ErrorPage from "@/components/Error";

// Similar to original page.tsx but with simplified props
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
    const stats = await db.getNumUsersAndMessages([hostData.id])
    const usersWithChat = userData.filter(user => stats[decryptedId][user.id].num_messages > 2);
    const {totalUsers, finishedUsers} = getUserStats(stats, decryptedId)
    
    return (
        <div className="p-4 md:p-8">
          <SessionResultHeader
            topic={hostData.topic}
            status={!hostData.active ? SessionStatus.REPORT_SENT : SessionStatus.ACTIVE}
          />
          <SessionResultsOverview
            id={hostData.id}
            active={hostData.active}
            startTime={hostData.start_time}
            numSessions={totalUsers}
            completedSessions={finishedUsers}
            showShare={false}  // Disable share feature
          />
          <SessionResultsSection
            hostData={hostData}
            userData={usersWithChat}
            id={hostData.id}
            showParticipants={false}  // Disable participants table
            showShare={false}  // Disable share feature
          />
        </div>
    );
  } catch (error) {
    console.error(`Error occurred fetching data: `, error);
    return <ErrorPage
      title={'Error loading sessions'}
      message={'One or more sessions could not be loaded.'}
    />;
  }
}
