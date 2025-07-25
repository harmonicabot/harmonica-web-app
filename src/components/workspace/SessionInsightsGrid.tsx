import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import { HostSession, UserSession } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { LinkIcon, Loader, Pencil, Plus } from 'lucide-react';
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
import {
  useUpsertWorkspace,
  useUpsertHostSession,
  useUpsertUserSessions,
  useHostSession,
  useWorkspace,
  useLinkSessionsToWorkspace,
  useUnlinkSessionFromWorkspace,
} from '@/stores/SessionStore';

interface SessionInsightsGridProps {
  workspaceId: string;
  showEdit?: boolean;
  availableSessions?: Pick<HostSession, 'id' | 'topic' | 'start_time'>[];
}

export default function SessionInsightsGrid({
  workspaceId,
  showEdit = false,
  availableSessions = [],
}: SessionInsightsGridProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: projectData, isLoading, isError } = useWorkspace(workspaceId);
  const localHostSessions = projectData?.hostSessions ?? [];
  const localUserData = projectData?.userData ?? [];

  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter out sessions that are already in the workspace
  const sessionsToLink = availableSessions.filter(
    (session) =>
      !localHostSessions.some((hostSession) => hostSession.id === session.id)
  );

  const handleCreateSession = () => {
    router.push(`/create?workspaceId=${workspaceId}`);
  };

  const handleSessionSelection = (sessionId: string) => {
    setSelectedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const linkSessions = useLinkSessionsToWorkspace();
  const handleLinkSessions = async () => {
    linkSessions.mutate({ workspaceId, sessionIds: selectedSessions });
    if (linkSessions.isPending) return <Loader />;
    if (linkSessions.isError)
      toast({ title: 'Error', description: linkSessions.error.message });
    if (linkSessions.isSuccess)
      toast({ title: 'Success', description: 'Sessions linked!' });
  };

  const unlinkSession = useUnlinkSessionFromWorkspace();
  const handleRemoveSession = async (sessionId: string) => {
    unlinkSession.mutate({ workspaceId, sessionId });

    if (unlinkSession.isPending) return <Loader />;
    if (unlinkSession.isError) {
      toast({
        title: 'Error',
        description:
          'Failed to remove session from project\n' +
          unlinkSession.error.message,
        variant: 'destructive',
      });
    }
    if (unlinkSession.isSuccess) {
      toast({
        title: 'Session removed',
        description: 'The session has been removed from this project',
      });
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
              (user) => user.session_id === hostData.id
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
                                  session.start_time
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
