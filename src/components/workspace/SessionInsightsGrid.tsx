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
import { linkSessionsToWorkspace, unlinkSessionFromWorkspace } from '@/lib/workspaceActions';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [localHostSessions, setLocalHostSessions] = useState<HostSession[]>(hostSessions);

  // Filter out sessions that are already in the workspace
  const sessionsToLink = availableSessions.filter(
    session => !localHostSessions.some(hostSession => hostSession.id === session.id)
  );

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
      toast({
        title: "Error",
        description: "Failed to link sessions to workspace",
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
      setSelectedSessions([]);
    }
  };
  
  const handleRemoveSession = async (sessionId: string) => {
    try {
      // First update the local state for immediate UI feedback
      setLocalHostSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // Then perform the actual unlinking in the database
      await unlinkSessionFromWorkspace(workspaceId, sessionId);
      
      toast({
        title: "Session removed",
        description: "The session has been removed from this workspace",
      });
      
      // Optionally refresh the page to ensure data consistency
      // router.refresh();
    } catch (error) {
      console.error('Failed to remove session:', error);
      toast({
        title: "Error",
        description: "Failed to remove session from workspace",
        variant: "destructive"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Host Sessions cards at the top */}
          {localHostSessions.map((hostData) => (
            <SessionSummaryCard
              key={hostData.id}
              hostData={hostData}
              userData={userData.filter(
                (user) => user.session_id === hostData.id
              )}
              workspace_id={workspaceId}
              id={hostData.id}
              usePublicAccess={isPublicAccess}
              onRemove={showEdit ? handleRemoveSession : undefined}
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
