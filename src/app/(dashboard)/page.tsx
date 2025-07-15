import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { WorkspacesTable } from './workspaces-table';
import * as db from '@/lib/db';
import Link from 'next/link';
import { cache } from 'react';
import ErrorPage from '@/components/Error';
import { getGeneratedMetadata } from 'app/api/metadata';
import { Card, CardContent } from '@/components/ui/card';
import { HostSession, Workspace } from '@/lib/schema';
import DonateBanner from '@/components/DonateBanner';
import { getSession } from '@auth0/nextjs-auth0';
import ProjectsGrid from './ProjectsGrid';
import { Textarea } from '@/components/ui/textarea';
import CreateSessionInputClient from './CreateSessionInputClient';

export const dynamic = 'force-dynamic'; // getHostSessions is using auth, which can only be done client side
export const revalidate = 300; // Revalidate the data every 5 minutes (or on page reload)
export const metadata = getGeneratedMetadata('/');

const sessionCache = cache(async () => {
  try {
    // Get the current user session to access user ID
    const session = await getSession();
    const userId = session?.user?.sub;

    if (!userId) {
      console.warn('No user ID found');
      return { hostSessions: [], workspacesWithSessions: [] };
    }

    // Query sessions with permissions check
    const userResources = await db.getResourcesForUser(userId);

    // First, check whether there are some ovverriding permissions (e.g. admin for all resources):
    const hasAccessToAllResources = userResources.some(
      (res) => res.resource_id === 'global',
    ); // global = admin access to all resources
    if (hasAccessToAllResources) {
      // This block is strictly speaking not necessary any more, but it might still be more performant, so leaving it here.
      // For users with global access, fetch ALL sessions without client filtering
      const hostSessions = (await db.getHostSessions([
        'id',
        'topic',
        'start_time',
        'final_report_sent',
        'active',
        'client',
      ])) as HostSession[]; // Type assertion since we know these fields are required

      // Get ALL workspace IDs

      let allWorkspaces = await db.getAllWorkspaces();

      // Find workspaces marked for deletion
      const workspacesToDelete = allWorkspaces.filter(
        (wspace) => wspace.status === 'deleted',
      );

      // Delete them
      if (workspacesToDelete.length > 0) {
        console.log(
          `Deleting ${workspacesToDelete.length} workspaces marked as 'deleted'`,
        );
        await Promise.all(
          workspacesToDelete.map((workspace) =>
            db.deleteWorkspace(workspace.id),
          ),
        );
      }

      // Filter out the deleted workspaces from the list
      allWorkspaces = allWorkspaces.filter(
        (wspace) => wspace.status !== 'deleted',
      );

      // Get sessions for each workspace
      const workspaceAndSessionsIds: Record<string, string[]> =
        Object.fromEntries(
          await Promise.all(
            allWorkspaces.map(async (w) => [
              w.id,
              await db.getWorkspaceSessionIds(w.id),
            ]),
          ),
        );

      // Combine workspaces with their sessions
      const workspacesWithSessions = await combineWorkspacesWithSessions(
        allWorkspaces,
        workspaceAndSessionsIds,
        hostSessions,
      );

      return { hostSessions, workspacesWithSessions };
    }
    const hostSessionIds = userResources
      .filter((r) => r.resource_type === 'SESSION')
      .map((r) => r.resource_id);
    const workspaceIds = userResources
      .filter((r) => r.resource_type === 'WORKSPACE')
      .map((r) => r.resource_id);

    const workspaces = await db.getWorkspacesForIds(workspaceIds);

    const workspaceAndSessionsIds: Record<string, string[]> =
      Object.fromEntries(
        await Promise.all(
          workspaceIds.map(async (wId) => [
            wId,
            await db.getWorkspaceSessionIds(wId),
          ]),
        ),
      );

    const hostSessions = await db.getHostSessionsForIds(hostSessionIds, [
      'id',
      'topic',
      'start_time',
      'final_report_sent',
      'active',
      'client',
    ]);

    const workspacesWithSessions = await combineWorkspacesWithSessions(
      workspaces,
      workspaceAndSessionsIds,
      hostSessions,
    );

    return { hostSessions, workspacesWithSessions };
  } catch (error) {
    console.error('Failed to fetch host sessions: ', error);
    return { hostSessions: [], workspacesWithSessions: [] };
  }
});

export type WorkspaceWithSessions = Workspace & { sessions: HostSession[] };

async function combineWorkspacesWithSessions(
  workspaces: Workspace[],
  workspaceAndSessionsIds: Record<string, string[]>,
  hostSessions: HostSession[],
): Promise<WorkspaceWithSessions[]> {
  // Get all session IDs that need to be fetched but aren't in hostSessions
  const allSessionIds = Object.values(workspaceAndSessionsIds).flat();
  const existingSessionIds = new Set(hostSessions.map((s) => s.id));
  const missingSessionIds = allSessionIds.filter(
    (id) => !existingSessionIds.has(id),
  );

  // Fetch all missing sessions
  const newSessionsMap: Record<string, HostSession> = {};
  if (missingSessionIds.length > 0) {
    const newSessions = await db.getHostSessionsForIds(missingSessionIds, [
      'id',
      'topic',
      'start_time',
      'final_report_sent',
      'active',
      'client',
    ]);

    // Create a map for quick lookup
    newSessions.forEach((session) => {
      newSessionsMap[session.id] = session;
    });
  }

  // Create a map of all available sessions for quick lookup
  const sessionsMap: Record<string, HostSession> = {};
  hostSessions.forEach((session) => {
    sessionsMap[session.id] = session;
  });

  // Combine workspaces with their sessions
  return workspaces.map((workspace) => {
    const sessionIds = workspaceAndSessionsIds[workspace.id] || [];
    const sessions = sessionIds
      .map((sessionId) => sessionsMap[sessionId] || newSessionsMap[sessionId])
      .filter(Boolean);

    return { ...workspace, sessions };
  });
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const { hostSessions, workspacesWithSessions } = await sessionCache();
  if (!hostSessions) {
    return <ErrorPage title={''} message={''} />;
  }

  return (
    <div className="bg-background min-h-screen">
      {Date.now() < new Date('2025-02-14').getTime() && <DonateBanner />}
      {/* Welcome Banner */}
      <div className="border rounded-xl bg-gradient-to-b from-white to-amber-100 p-8 mb-10 flex flex-col md:flex-row items-stretch gap-8">
        {/* Left column */}
        <div className="flex-1 flex flex-col justify-center">
          <img src="/harmonica-logo-sm.png" alt="Harmonica logo" className="w-16 mb-6" />
          <div>
            <h1 className="text-4xl font-semibold tracking-tight mb-2">Welcome!</h1>
            <p className="text-muted-foreground text-lg">Ready to uncover something new?</p>
          </div>
        </div>
        {/* Right column */}
        <div className="flex-1 flex flex-col justify-center">
          <label htmlFor="dashboard-objective" className="block text-base font-medium mb-2">Create a new session</label>
          <CreateSessionInputClient />
        </div>
      </div>
      {/* Main dashboard content */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Projects</h2>
      </div>
      <div className="mb-10">
        <ProjectsGrid workspaces={workspacesWithSessions} searchParams={searchParams} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Sessions</h2>
        {hostSessions.length > 0 ? (
          <SessionsTable sessions={hostSessions} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground text-lg mb-4">No sessions yet, create one to get started.</p>
              <div className="flex justify-center gap-4">
                <CreateSessionButton text="Get Started" />
                <Link href="https://harmonica.chat/support" target="_blank">
                  <Button variant="outline">
                    How it works
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreateSessionButton({ text = 'Create Session' }: { text?: string }) {
  return (
    <Link href="/create">
      <Button>
        {text}
        <ChevronRight />
      </Button>
    </Link>
  );
}

function CreateWorkspaceButton({ text = 'Create Project' }: { text?: string }) {
  const workspaceId = `wsp_${Math.random().toString(36).substring(2, 14)}`;
  const link = `/workspace/${workspaceId}`;
  return (
    <Link href={link}>
      <Button size="lg">
        <PlusCircle />
        {text}
      </Button>
    </Link>
  );
}
