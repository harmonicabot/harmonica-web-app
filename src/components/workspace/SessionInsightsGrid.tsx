import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import { HostSession, UserSession } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { LinkIcon, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { linkSessionsToWorkspace } from '@/lib/workspaceActions';

interface SessionInsightsGridProps {
  hostSessions: HostSession[];
  userData: UserSession[];
  workspaceId: string;
  isPublicAccess?: boolean;
  showEdit?: boolean;
  availableSessions?: Pick<HostSession, 'id' | 'topic' | 'start_time'>[];
}

export default function SessionInsightsGrid({
  hostSessions,
  userData,
  workspaceId,
  isPublicAccess = false,
  showEdit = false,
  availableSessions = [],
}: SessionInsightsGridProps) {
  const router = useRouter();
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  // Filter out sessions that are already in the workspace
  const sessionsToLink = availableSessions.filter(
    session => !hostSessions.some(hostSession => hostSession.id === session.id)
  );

  console.log("Available sessions: ", availableSessions)
  console.log("Sessions to link: ", sessionsToLink)

  const handleCreateSession = () => {
    // Store the workspace ID in localStorage to retrieve after session creation
    localStorage.setItem('pendingWorkspaceLink', workspaceId);
    router.push('/create');
  };

  const handleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleLinkSessions = async () => {
    if (selectedSessions.length === 0) return;
    
    setIsLinking(true);
    try {
      await linkSessionsToWorkspace(workspaceId, selectedSessions);
      router.refresh(); // Refresh the page to show the newly linked sessions
    } catch (error) {
      console.error('Failed to link sessions:', error);
      // You might want to add error handling UI here
    } finally {
      setIsLinking(false);
      setSelectedSessions([]);
    }
  };
  
  return (
    <Card className="mt-4 relative group">
      <CardHeader>
        <h2 className="text-2xl font-semibold">Individual Session Insights</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Host Sessions cards at the top */}
          {hostSessions.map((hostData) => (
            <SessionSummaryCard
              key={hostData.id}
              hostData={hostData}
              userData={userData.filter(
                (user) => user.session_id === hostData.id
              )}
              workspace_id={workspaceId}
              id={hostData.id}
              usePublicAccess={isPublicAccess}
            />
          ))}
          
          {showEdit &&
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
              <Dialog>
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
                          Connect an existing session to this workspace
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
                      <p className="text-center text-gray-500">No available sessions yet. Create one first.</p>
                    ) : (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {sessionsToLink.map(session => (
                          <div key={session.id} className="flex items-start space-x-2">
                            <Checkbox 
                              id={session.id} 
                              checked={selectedSessions.includes(session.id)}
                              onCheckedChange={() => handleSessionSelection(session.id)}
                            />
                            <div className="grid gap-1.5">
                              <Label htmlFor={session.id} className="font-medium">
                                {session.topic}
                              </Label>
                              <p className="text-sm text-gray-500">
                                {new Date(session.start_time).toLocaleDateString()}
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
          }
        </div>
      </CardContent>
    </Card>
  );
}
