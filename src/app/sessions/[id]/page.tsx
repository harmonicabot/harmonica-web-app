import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface';
import { getGeneratedMetadata } from 'app/api/metadata';
import * as db from '@/lib/db';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { decryptId } from '@/lib/encryptionUtils';
import ErrorPage from '@/components/Error';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import { getUserStats } from '@/lib/utils';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

// Note: this metadata generation only works if the user is logged in.
export async function generateMetadata(
  { params }: { params: { id: string } } ,
): Promise<Metadata> {
  return getGeneratedMetadata(`/sessions/${params.id}`);
}

export default async function SessionResult({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const decryptedId = decryptId(id);

  try {
    const hostData = await db.getHostSessionById(decryptedId);
    const userData = await db.getUsersBySessionId(decryptedId);
    const stats = await db.getNumUsersAndMessages([hostData])
    const sessionsWithChat = userData.filter(user => stats[decryptedId][user.id].num_messages > 2);
    const {totalUsers, finishedUsers} = getUserStats(stats, decryptedId)
    
    if (!hostData)
      return (
        <ErrorPage
          title={`No data available for ${id}`}
          message="Looks like the provided SessionID is invalid or was deleted."
        />
      );

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
          <SessionResultsOverview
            id={hostData.id}
            active={hostData.active}
            startTime={hostData.start_time}
            numSessions={totalUsers}
            completedSessions={finishedUsers}
          />
          <SessionResultsSection
            hostData={hostData}
            userData={sessionsWithChat}
            id={hostData.id}
          />
        </div>
    );
  } catch (error) {
    console.error(`Error occured fetching data: `, error);
    return (
      <ErrorPage
        title={'Error loading session'}
        message={
          'The session ID might be incorrect or the session may no longer exist.'
        }
      />
    );
  }
}