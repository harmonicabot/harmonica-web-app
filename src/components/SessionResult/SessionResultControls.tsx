'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Settings, Copy, InfoIcon, Trash2 } from 'lucide-react';
import * as db from '@/lib/db';
import { SummaryUpdateManager } from '../../summary/SummaryUpdateManager';
import { cloneSession } from '@/lib/serverUtils';
import { useRouter } from 'next/navigation';
import { toast } from 'hooks/use-toast';
import { encryptId } from '@/lib/encryptionUtils';
import { PromptSettings } from './ResultTabs/components/PromptSettings';
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

interface SessionResultControlsProps {
  id: string;
  isFinished: boolean;
  readyToGetSummary: boolean;
  currentPrompt?: string;
  summaryPrompt?: string;
  crossPollination?: boolean;
  sessionTopic?: string;
}

export default function SessionResultControls({
  id,
  isFinished,
  readyToGetSummary,
  currentPrompt = '',
  summaryPrompt = '',
  crossPollination = true,
  sessionTopic = '',
}: SessionResultControlsProps) {
  const [loadSummary, setLoadSummary] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  return (
    <Card className="flex-grow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Session Controls</CardTitle>
          <Settings className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => (isFinished ? reopenSession() : finishSession())}
            disabled={loadSummary || isCloning || isDeleting}
          >
            {isFinished ? 'Reopen' : 'Finish'}
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
            onClick={handleCloneSession}
            disabled={isCloning || isDeleting}
          >
            {isCloning ? (
              <LoaderCircle className="mr-2 w-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Clone Session
          </Button>

          <PromptSettings
            isProject={false}
            sessionFacilitationPrompt={currentPrompt}
            summaryPrompt={summaryPrompt}
            onPromptChange={handlePromptChange}
          />

          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isCloning || isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Session
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Cross Pollination</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p>
                  Enable cross-pollination to allow participants to see and
                  build upon each other's responses. This feature promotes
                  collaborative thinking and can lead to more diverse and
                  innovative ideas.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Switch
            checked={localCrossPollination}
            onCheckedChange={handleCrossPollination}
          />
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
      </CardContent>
    </Card>
  );
}
