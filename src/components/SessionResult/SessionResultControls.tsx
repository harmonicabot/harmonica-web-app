'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Settings, Copy, InfoIcon, Trash2, MoreHorizontal } from 'lucide-react';
import * as db from '@/lib/db';
import { SummaryUpdateManager } from '../../summary/SummaryUpdateManager';
import { cloneSession } from '@/lib/serverUtils';
import { useRouter } from 'next/navigation';
import { toast } from 'hooks/use-toast';
import { encryptId } from '@/lib/encryptionUtils';
import { PromptSettings } from './ResultTabs/components/PromptSettings';
import { SessionOverviewModal } from './ResultTabs/components/SessionOverviewModal';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SessionResultControlsProps {
  id: string;
  isFinished: boolean;
  readyToGetSummary: boolean;
  currentPrompt?: string;
  summaryPrompt?: string;
  crossPollination?: boolean;
  sessionTopic?: string;
  sessionData?: {
    topic: string;
    goal: string;
    critical: string;
    context: string;
    crossPollination: boolean;
    promptSummary: string;
    facilitationPrompt?: string;
  };
}

export default function SessionResultControls({
  id,
  isFinished,
  readyToGetSummary,
  currentPrompt = '',
  summaryPrompt = '',
  crossPollination = true,
  sessionTopic = '',
  sessionData,
}: SessionResultControlsProps) {
  const [loadSummary, setLoadSummary] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSessionOverviewModal, setShowSessionOverviewModal] = useState(false);
  const [localCrossPollination, setLocalCrossPollination] =
    useState(crossPollination);
  const router = useRouter();

  const handlePromptChange = async (
    newPrompt: string,
    type: 'facilitation' | 'summary',
  ) => {
    try {
      const updateData =
        type === 'facilitation'
          ? { prompt: newPrompt }
          : { summary_prompt: newPrompt };

      await db.updateHostSession(id, updateData);
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast({
        title: 'Failed to update prompt',
        description: 'An error occurred while updating the prompt.',
        variant: 'destructive',
      });
    }
  };

  const handleCrossPollination = async (checked: boolean) => {
    try {
      // Update local state immediately for responsive UI
      setLocalCrossPollination(checked);

      // Update database
      await db.updateHostSession(id, { cross_pollination: checked });

      // Show success toast
      toast({
        title: 'Cross-pollination setting updated',
        description: checked
          ? "Participants can now see each other's responses"
          : "Participants can no longer see each other's responses",
      });

      // Refresh the page to ensure all components reflect the new state
      router.refresh();
    } catch (error) {
      // Revert local state on error
      setLocalCrossPollination(!checked);
      console.error('Failed to update cross-pollination:', error);
      toast({
        title: 'Failed to update setting',
        description: 'An error occurred while updating cross-pollination.',
        variant: 'destructive',
      });
    }
  };

  const finishSession = async () => {
    await db.deactivateHostSession(id);
  };

  const reopenSession = async () => {
    console.log('Reopening session');
    await db.updateHostSession(id, { active: true });
  };

  const updateSummary = async () => {
    setLoadSummary(true);
    await SummaryUpdateManager.updateNow(id);
    setLoadSummary(false);
  };

  const handleCloneSession = async () => {
    setIsCloning(true);
    try {
      const newSessionId = await cloneSession(id);
      if (newSessionId) {
        toast({
          title: 'Session cloned successfully',
          description: "You'll be redirected to the new session.",
        });
        router.push(`/sessions/${encryptId(newSessionId)}`);
      } else {
        toast({
          title: 'Failed to clone session',
          description: 'An error occurred while cloning the session.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cloning session:', error);
      toast({
        title: 'Failed to clone session',
        description: 'An error occurred while cloning the session.',
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteSession = async () => {
    setIsDeleting(true);
    try {
      await db.deleteHostSession(id);
      toast({
        title: 'Session deleted',
        description: 'The session has been successfully deleted.',
      });
      router.push('/');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Failed to delete session',
        description: 'An error occurred while deleting the session.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSessionUpdate = async (updates: any) => {
    try {
      // Map the field names to database field names
      const dbUpdates: any = {};
      if (updates.sessionName) dbUpdates.topic = updates.sessionName;
      if (updates.goal) dbUpdates.goal = updates.goal;
      if (updates.critical) dbUpdates.critical = updates.critical;
      if (updates.context) dbUpdates.context = updates.context;
      if (updates.crossPollination !== undefined) dbUpdates.cross_pollination = updates.crossPollination;

      await db.updateHostSession(id, dbUpdates);
      
      toast({
        title: 'Session updated',
        description: 'The session details have been successfully updated.',
      });
      
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Failed to update session:', error);
      toast({
        title: 'Failed to update session',
        description: 'An error occurred while updating the session.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePrompt = async (prompt: string) => {
    try {
      await db.updateHostSession(id, { prompt });
      toast({
        title: 'Prompt updated',
        description: 'The facilitation prompt has been successfully updated.',
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast({
        title: 'Failed to update prompt',
        description: 'An error occurred while updating the prompt.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSession = () => {
    // TODO: Navigate to the review step of the create session flow
    // This will need to be implemented to take users to the refine step
    // with the current session data pre-populated
    toast({
      title: 'Edit Session',
      description: 'This will take you to the session editing flow.',
    });
  };

  return (
    <Card className="flex-grow flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Session Controls</CardTitle>
          <Settings className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          {/* Content area - can be used for future controls */}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-auto pt-4">
          <Button
            onClick={() => (isFinished ? reopenSession() : finishSession())}
            disabled={loadSummary || isCloning || isDeleting}
          >
            {isFinished ? 'Reopen' : 'End Session'}
          </Button>
          {readyToGetSummary && (
            <Button
              variant="secondary"
              onClick={updateSummary}
              disabled={loadSummary || isCloning || isDeleting}
            >
              Refresh Summary
              {loadSummary && (
                <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />
              )}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowSessionOverviewModal(true)}
            disabled={isCloning || isDeleting}
          >
            <Settings className="h-4 w-4" />
            Edit Session
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isCloning || isDeleting}>
                More
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCloneSession} disabled={isCloning}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)} 
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>


        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This will permanently delete the session and all its data. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSession}
                disabled={isDeleting}
                variant="destructive"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {sessionData && (
          <SessionOverviewModal
            isOpen={showSessionOverviewModal}
            onClose={() => setShowSessionOverviewModal(false)}
            sessionData={sessionData}
            onUpdateSession={handleSessionUpdate}
            onUpdatePrompt={handleUpdatePrompt}
            onEditSession={handleEditSession}
          />
        )}
      </CardContent>
    </Card>
  );
}
