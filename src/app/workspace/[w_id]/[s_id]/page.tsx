import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { getUserStats } from '@/lib/clientUtils';
import { decryptId } from '@/lib/encryptionUtils';
import * as db from '@/lib/db';
import ErrorPage from '@/components/Error';

export const maxDuration = 300; // in seconds

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
  searchParams,
}: {
    params: { w_id: string, s_id: string };
    searchParams: { access?: string };
}) {
  const { s_id } = params;
  console.log("Encrypted ID: ", s_id);
  const decryptedId = decryptId(s_id);
  console.log("Decrypted ID: ", decryptedId);

  
  try {
    const hostData = await db.getHostSessionById(decryptedId);
    if (searchParams.access === 'public' && !hostData.is_public) {
      // Check whether the parent workspace is public; allow access if it is.
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
          showShare={hostData.active}
        />
        <SessionResultsSection
          hostData={hostData}
          userData={usersWithChat}
          resourceId={hostData.id}
          showParticipants={true}
          showShare={false} // Disable share feature
          showSessionRecap={false}
          chatEntryMessage={{
            role: 'assistant',
            content: `Bienvenue au Sommet IA de l'ENS-PSL! Je suis là pour vous aider à comprendre les enseignements des discussions précédentes.

Voici quelques questions que vous pourriez poser :
  - Quels ont été les thèmes principaux abordés lors de cette session ?
  - Comment les participants ont-ils perçu le rôle de l'IA dans le [sujet] ?
  - Quelles étaient les principales préoccupations concernant l'adoption de l'IA ?
  
You can also ask me in any other language, and I will try my best to reply in your language. (However, I might not always get that right 😅)`,
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
