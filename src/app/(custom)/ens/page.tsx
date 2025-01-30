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
import ResultTabs from '@/components/SessionResult/ResultTabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

export default async function MultiSessionResults() {
  // Hardcoded array of session IDs
  const sessionIds = [
    'aHN0XzU0ZTI3Y2Y4NzI0ZQ==',
    'aHN0XzZlOTc5OTY5NGMwMA==',
    'aHN0XzFkN2JmYzQxMDZmNg==',
    'aHN0X2ViYzM0MjlmOWE0Nw==',
    'aHN0X2FjZTllNWRiNDMyNg==',
    'aHN0X2RiMjI4NzQzN2M1YQ==',
  ];
  const decryptedIds = sessionIds.map((id) => decryptId(id));

  try {
    const [hostSessions, allUserData, stats] = await Promise.all([
      Promise.all(decryptedIds.map((id) => db.getHostSessionById(id))),
      Promise.all(decryptedIds.map((id) => db.getUsersBySessionId(id))),
      db.getNumUsersAndMessages(decryptedIds),
    ]);

    // Merge all user data into one flat array
    const userData = allUserData.flat();

    return (
      <div className="p-4 md:p-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-4">
            AI Summit: Shaping the Future of AI in France
          </h1>
          <p className="text-xl mb-4">
            Join us for an engaging discussion on artificial intelligence and
            its impact on French society
          </p>
          <div className="flex items-center gap-2 text-blue-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              Paris University, in collaboration with Mission Publique
            </span>
          </div>
        </div>
        <div className="mt-8 flex flex-col lg:flex-row gap-4">
          <ResultTabs
            hostData={hostSessions[0]}
            userData={userData}
            id={decryptedIds[0]}
            hasNewMessages={false}
            showParticipants={false}
            showSessionRecap={false}
          />
        </div>
        <Card className="mt-4">
          <CardHeader>
            <h2 className="text-2xl font-semibold">
              Individual Session Insights
            </h2>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
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
