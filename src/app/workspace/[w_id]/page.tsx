import * as db from '@/lib/db';
import { decryptId } from '@/lib/encryptionUtils';
import ErrorPage from '@/components/Error';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import ResultTabs from '@/components/SessionResult/ResultTabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getSession } from '@auth0/nextjs-auth0';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

export default async function MultiSessionResults({
  params,
  searchParams,
}: {
    params: { w_id: string };
    searchParams: { access?: string };
}) {
  // While in development, we just take whichever six last sessions the user has access to.
  // Once we created the ENS sessions, we will hardcode those. Or, identify them in some way.

  async function setupENSWorkspace() {
    // 1. Get latest 6 sessions from host_db
    console.log('Create ENS workspace');
    const latestSessions = await db.getHostSessions(['id'], 1, 6);
    const sessionIds = latestSessions.map((session: any) => session.id);

    // 2. Create new workspace
    const workspace = await db.createWorkspace({
      title: 'ENS Workspace',
      description: 'AI Summit: Shaping the Future of AI in France',
      created_at: new Date(),
    });

    if (!workspace) {
      throw new Error('Failed to create workspace');
    }

    // 3. Add sessions to workspace
    for (const sessionId of sessionIds) {
      await db.addSessionToWorkspace(workspace.id, sessionId);
    }

    // 4. Get current user
    const session = await getSession();
    const userId = session?.user?.sub;

    if (!userId) {
      throw new Error('No user found');
    }

    // 5. Set admin permissions for user on workspace and all sessions
    await db.setPermission(workspace.id, userId, 'admin');

    for (const sessionId of sessionIds) {
      await db.setPermission(sessionId, userId, 'admin');
    }

    console.log('ENS Workspace setup complete');
    console.log('Workspace ID:', workspace.id);
    console.log('Added sessions:', sessionIds);
  }

  // TODO: Development code only to set up an example workspace.
  if ((await db.getAllWorkspaceIds()).length === 0) {
    setupENSWorkspace();
  }
  
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
  
  const sessionIds = await db.getWorkspaceSessions(params.w_id);
  try {
    const [hostSessions, allUserData] = await Promise.all([
      Promise.all(sessionIds.map((id) => db.getHostSessionById(id))),
      Promise.all(sessionIds.map((id) => db.getUsersBySessionId(id))),
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
              Paris University, in collaboration with Mission Publique &
              Harmonica AI
            </span>
          </div>
        </div>
        <div className="mt-8 flex flex-col lg:flex-row gap-4">
          <ResultTabs
            hostData={hostSessions[0]}
            userData={userData}
            id={sessionIds[0]}
            hasNewMessages={false}
            showParticipants={false}
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
                  workspace_id={params.w_id}
                  hostData={hostData}
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
