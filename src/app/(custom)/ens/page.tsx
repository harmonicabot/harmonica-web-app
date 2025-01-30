
import * as db from '@/lib/db';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { decryptId } from '@/lib/encryptionUtils';
import ErrorPage from '@/components/Error';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import { getUserStats } from '@/lib/clientUtils';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes


export default async function MultiSessionResults() {
  // Hardcoded array of session IDs
  const sessionIds = ['aHN0XzU0ZTI3Y2Y4NzI0ZQ==', 'aHN0XzZlOTc5OTY5NGMwMA==', 'aHN0XzFkN2JmYzQxMDZmNg=='];
  const decryptedIds = sessionIds.map(id => decryptId(id));

  try {
    const [hostSessions, allUserData, stats] = await Promise.all([
      Promise.all(decryptedIds.map(id => db.getHostSessionById(id))),
      Promise.all(decryptedIds.map(id => db.getUsersBySessionId(id))),
      db.getNumUsersAndMessages(decryptedIds)
    ]);

    return (
      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostSessions.map((hostData, index) => (
            <SessionSummaryCard
              key={hostData.id}
              hostData={hostData}
              stats={stats[decryptedIds[index]]}
              userData={allUserData[index]}
              id={sessionIds[index]}
            />
          ))}
        </div>
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
