import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import { HostSession, UserSession } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { LinkIcon, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  linkSessionsToWorkspace,
  unlinkSessionFromWorkspace,
} from '@/lib/workspaceActions';
import { useToast } from 'hooks/use-toast';
import * as db from '@/lib/db';
import { useSessionStore } from '@/stores/SessionStore';

interface SessionInsightsGridProps {
  hostSessions: HostSession[];
  userData: UserSession[];
  workspaceId: string;
  showEdit?: boolean;
  availableSessions?: Pick<HostSession, 'id' | 'topic' | 'start_time'>[];
}

export default function SessionInsightsGrid({
  hostSessions,
  userData,
  workspaceId,
  showEdit = false,
  availableSessions = [],
}: SessionInsightsGridProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [localHostSessions, setLocalHostSessions] =
    useState<HostSession[]>(hostSessions);
  const [localUserData, setLocalUserData] = useState<UserSession[]>(userData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { upsertWorkspaces, upsertHostData, upsertUserData, hostData, userData: storeUserData } = useSessionStore()

  // Update local state when props change
  useEffect(() => {
    setLocalHostSessions(hostSessions);
    setLocalUserData(userData);
  }, [hostSessions, userData]);

  // Filter out sessions that are already in the workspace
  const sessionsToLink = availableSessions.filter(
    (session) =>
      !localHostSessions.some((hostSession) => hostSession.id === session.id),
  );

  const handleCreateSession = () => {
    router.push(`/create?workspaceId=${workspaceId}`);
  };

  const handleSessionSelection = (sessionId: string) => {
    setSelectedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId],
    );
  };

  const handleLinkSessions = async () => {
    if (selectedSessions.length === 0) return;

    setIsLinking(true);
    try {
      // First, link the sessions to the workspace
      await linkSessionsToWorkspace(workspaceId, selectedSessions);

      // Determine which sessions are not already in the store
      const sessionsToFetch = selectedSessions.filter(
        (sessionId) => !hostData[sessionId]
      );

      let newSessionsData: HostSession[] = [];
      let newUserData: UserSession[][] = [];

      if (sessionsToFetch.length > 0) {
        // Fetch only missing session data and user data
        [newSessionsData, newUserData] = await Promise.all([
          Promise.all(
            sessionsToFetch.map(async (sessionId) => {
              const sessionData = await db.getHostSessionById(sessionId);
              return sessionData;
            })
          ),
          Promise.all(
            sessionsToFetch.map(async (sessionId) => {
              const users = await db.getUsersBySessionId(sessionId);
              return users;
            })
          ),
        ]);

        // Update local state with the new session data
        setLocalHostSessions((prev) => [...prev, ...newSessionsData]);

        // Update local user data
        const flattenedUserData = newUserData.flat();
        setLocalUserData((prev) => [...prev, ...flattenedUserData]);

        // Update the store with new data
        newSessionsData.forEach((host, idx) => {
          upsertHostData(host.id, host);
          upsertUserData(host.id, newUserData[idx]);
        });
      }

      // Always update workspace mapping in the store
      upsertWorkspaces(workspaceId, {}, selectedSessions);

      setDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Sessions linked successfully',
      });
    } catch (error) {
      console.error('Failed to link sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to link sessions to project',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
      setSelectedSessions([]);
    }
  };

  const handleRemoveSession = async (sessionId: string) => {
    try {
      // Update local state immediately
      setLocalHostSessions((prev) =>
        prev.filter((session) => session.id !== sessionId),
      );

      // Perform the actual unlinking
      await unlinkSessionFromWorkspace(workspaceId, sessionId);

      // Update links in the store (but don't remove fetched sessions, it won't be visible but available faster if the user visits it again...)
      upsertWorkspaces(workspaceId, {}, [...selectedSessions.filter(session => session !== sessionId)]);

      toast({
        title: 'Session removed',
        description: 'The session has been removed from this project',
      });
    } catch (error) {
      console.error('Failed to remove session:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove session from project',
        variant: 'destructive',
      });

      // Revert the local state change if the operation failed
      setLocalHostSessions(hostSessions);
    }
  };

  return (
    <Card className="mt-4 relative group">
      <CardHeader>
        <h2 className="text-2xl font-semibold">Individual Session Insights</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-auto-fit gap-4">
          {/* Host Sessions cards at the top */}
          {localHostSessions.map((hostData) => {
            // Get the corresponding user data for this session
            const sessionUserData = localUserData.filter(
              (user) => user.session_id === hostData.id,
            );

            // Calculate the number of participants
            const participantCount = sessionUserData.length;

            return (
              <SessionSummaryCard
                key={hostData.id}
                hostData={{
                  ...hostData,
                  goal: hostData.goal || 'No goal set',
                  num_sessions: participantCount,
                }}
                userData={sessionUserData}
                workspace_id={workspaceId}
                id={hostData.id}
                onRemove={showEdit ? handleRemoveSession : undefined}
              />
            );
          })}

          {showEdit && (
            <>
              <Card
                className="border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors"
                onClick={handleCreateSession}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] space-y-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Create New Session</h3>
                    <p className="text-sm text-gray-500">
                      Start a new discussion session from scratch
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Link Existing Session Card */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Card className="border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] space-y-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <LinkIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold mb-2">
                          Link Existing Session
                        </h3>
                        <p className="text-sm text-gray-500">
                          Connect an existing session to this project
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Link Existing Sessions</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    {sessionsToLink.length === 0 ? (
                      <p className="text-center text-gray-500">
                        No available sessions yet. Create one first.
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {sessionsToLink.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-start space-x-2"
                          >
                            <Checkbox
                              id={session.id}
                              checked={selectedSessions.includes(session.id)}
                              onCheckedChange={() =>
                                handleSessionSelection(session.id)
                              }
                            />
                            <div className="grid gap-1.5">
                              <Label
                                htmlFor={session.id}
                                className="font-medium"
                              >
                                {session.topic}
                              </Label>
                              <p className="text-sm text-gray-500">
                                {new Date(
                                  session.start_time,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleLinkSessions}
                      disabled={selectedSessions.length === 0 || isLinking}
                    >
                      {isLinking ? 'Linking...' : 'Link Selected Sessions'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
