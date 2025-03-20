import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
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
    const userResources = await db.getResourcesForUser(userId)

    // First, check whether there are some ovverriding permissions (e.g. admin for all resources):
    const hasAccessToAllResources = userResources.some(res => res.resource_id === 'global'); // global = admin access to all resources
    if (hasAccessToAllResources) {
      // This block is strictly speaking not necessary any more, but it might still be more performant, so leaving it here.
      // For users with global access, fetch ALL sessions without client filtering
      const hostSessions = await db.getHostSessions([
        'id',
        'topic',
        'start_time',
        'final_report_sent',
        'active',
        'client',
      ]);

      // Get ALL workspace IDs
      const allWorkspaces = await db.getAllWorkspaces();
      
      // Get sessions for each workspace
      const workspaceAndSessionsIds: Record<string, string[]> = Object.fromEntries(
        await Promise.all(
          allWorkspaces.map(async (w) => [w.id, await db.getWorkspaceSessionIds(w.id)])
        )
      );
      
      // Combine workspaces with their sessions
      const workspacesWithSessions = await combineWorkspacesWithSessions(
        allWorkspaces,
        workspaceAndSessionsIds,
        hostSessions
      );
      
      return { hostSessions, workspacesWithSessions };
    }
    const hostSessionIds = userResources.filter(r => r.resource_type === 'SESSION').map(r => r.resource_id)
    const workspaceIds = userResources.filter(r => r.resource_type === 'WORKSPACE').map(r => r.resource_id)

    const workspaces = await db.getWorkspacesForIds(workspaceIds)
    
    const workspaceAndSessionsIds: Record<string, string[]> = Object.fromEntries(
      await Promise.all(
        workspaceIds.map(async (wId) => [wId, await db.getWorkspaceSessionIds(wId)])
      )
    )

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
      hostSessions
    );

    return { hostSessions, workspacesWithSessions };
  } catch (error) {
    console.error('Failed to fetch host sessions: ', error);
    return { hostSessions: [], workspacesWithSessions: [] };
  }
});

export type WorkspaceWithSessions = Workspace & { sessions: HostSession[] }

async function combineWorkspacesWithSessions(
  workspaces: Workspace[],
  workspaceAndSessionsIds: Record<string, string[]>,
  hostSessions: HostSession[]
): Promise<WorkspaceWithSessions[]> {
  // Get all session IDs that need to be fetched but aren't in hostSessions
  const allSessionIds = Object.values(workspaceAndSessionsIds).flat();
  const existingSessionIds = new Set(hostSessions.map(s => s.id));
  const missingSessionIds = allSessionIds.filter(id => !existingSessionIds.has(id));

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
    newSessions.forEach(session => {
      newSessionsMap[session.id] = session;
    });
  }
  
  // Create a map of all available sessions for quick lookup
  const sessionsMap: Record<string, HostSession> = {};
  hostSessions.forEach(session => {
    sessionsMap[session.id] = session;
  });
  
  // Combine workspaces with their sessions
  return workspaces.map(workspace => {
    const sessionIds = workspaceAndSessionsIds[workspace.id] || [];
    const sessions = sessionIds
      .map(sessionId => sessionsMap[sessionId] || newSessionsMap[sessionId])
      .filter(Boolean);
      
    return { ...workspace, sessions };
  });
}

export default async function Dashboard() {
  console.log('Loading session data');
  const { hostSessions, workspacesWithSessions } = await sessionCache();
  if (!hostSessions) {
    return <ErrorPage title={''} message={''} />;
  }

  return (
    <>
      {Date.now() < new Date('2025-02-14').getTime() && (
        <DonateBanner />
      )}
      <Tabs defaultValue="sessions">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your sessions and workspaces
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <CreateSessionButton />
            <CreateWorkspaceButton />
          </div>
        </div>

        <TabsList className="mt-6">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            Sessions
            {hostSessions.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {hostSessions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="flex items-center gap-2">
            Workspaces
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {workspacesWithSessions.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          {hostSessions.length > 0 ? (
            <SessionsTable sessions={hostSessions} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-6">
                <CreateSessionButton text="Create Your First Session" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workspaces" className="mt-4">
          {workspacesWithSessions.length > 0 ? (
            <WorkspacesTable workspaces={workspacesWithSessions} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-6">
                <CreateWorkspaceButton text="Create Your First Workspace" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function CreateSessionButton({ text = 'Create Session' }: { text?: string }) {
  return (
    <Link href="/create">
      <Button size="lg" className="gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          {text}
        </span>
      </Button>
    </Link>
  );
}

function CreateWorkspaceButton({ text = 'Create Workspace' }: { text?: string }) {
  const workspaceId = `wsp_${Math.random().toString(36).substring(2, 14)}`
  const link = `/workspace/${workspaceId}`;
  return (
    <Link href={link}>
      <Button size="lg" className="gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          {text}
        </span>
      </Button>
    </Link>
  );
}