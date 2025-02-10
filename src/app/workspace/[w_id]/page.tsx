import * as db from '@/lib/db';
import { decryptId } from '@/lib/encryptionUtils';
import ErrorPage from '@/components/Error';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import ResultTabs from '@/components/SessionResult/ResultTabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getSession } from '@auth0/nextjs-auth0';
import { Metadata } from 'next';
import { getGeneratedMetadata } from 'app/api/metadata';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

export async function generateMetadata({
  params,
}: {
  params: { w_id: string };
}): Promise<Metadata> {
  return getGeneratedMetadata(`/workspace/${params.w_id}`);
}

export default async function MultiSessionResults({
  params,
  searchParams,
}: {
  params: { w_id: string };
  searchParams: { access?: string };
}) {
  if (searchParams.access === 'public') {
    const workspaceData = await db.getWorkspaceById(params.w_id);
    if (!workspaceData || !workspaceData.is_public) {
      return (
        <ErrorPage
          title="Access Denied"
          message="This session is not publicly accessible."
        />
      );
    }
  }

  let sessionIds = await db.getWorkspaceSessions(params.w_id);

  try {
    const [hostSessions, allUserData] = await Promise.all([
      Promise.all(sessionIds.map((id) => db.getHostSessionById(id))),
      Promise.all(sessionIds.map((id) => db.getUsersBySessionId(id))),
    ]);

    hostSessions.sort((a, b) => a.topic.localeCompare(b.topic));

    const stats = await db.getNumUsersAndMessages(
      hostSessions.map((session) => session.id),
    );
    const usersWithChat = allUserData.map((sessionUsers) =>
      sessionUsers.filter(
        (user) =>
          stats[user.session_id][user.id].num_messages > 2 &&
          user.include_in_summary,
      ),
    );

    // Merge all filtered user data into one flat array
    const userData = usersWithChat.flat();

    return (
      <div className="p-4 md:p-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-900 to-purple-400 text-white rounded-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Assemblée étudiante sur l’IA
          </h1>
          <p className="text-xl mb-4">
            Explorer ensemble les enjeux liés à l’IA et faire des propositions
            d’actions pour un développement de l’IA au service du bien commun.
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
              Projet initié par l’Ecole Normale Supérieure, l’université de Yale
              et Missions Publiques
            </span>
          </div>
        </div>
        <div className="mt-8 flex flex-col lg:flex-row gap-4">
          <ResultTabs
            hostData={hostSessions}
            userData={userData}
            id={params.w_id}
            isWorkspace={true}
            hasNewMessages={false}
            showParticipants={false}
            showSessionRecap={false}
            sessionIds={sessionIds}
            chatEntryMessage={{
              role: 'assistant',
              content: `Bienvenue au Sommet IA de l'ENS-PSL! Je suis là pour vous aider à comprendre les enseignements des discussions précédentes.

Voici quelques questions que vous pourriez poser :
  - Quels ont été les thèmes principaux abordés lors des sessions ?
  - Comment les participants ont-ils perçu le rôle de l'IA dans l'éducation ?
  - Quelles étaient les principales préoccupations concernant l'adoption de l'IA ?
  
You can also ask me in any other language, and I will try my best to reply in your language. (However, I might not always get that right 😅)`,
            }}
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
              {hostSessions.map((hostData) => (
                <SessionSummaryCard
                  key={hostData.id}
                  workspace_id={params.w_id}
                  hostData={hostData}
                  userData={userData.filter(
                    (user) => user.session_id === hostData.id,
                  )}
                  id={hostData.id}
                  usePublicAccess={searchParams.access === 'public'}
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
