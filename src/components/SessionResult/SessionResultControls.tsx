'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Settings, Copy, InfoIcon } from 'lucide-react';
import * as db from '@/lib/db';
import { createSummary } from '@/lib/serverUtils';
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

interface SessionResultControlsProps {
  id: string;
  isFinished: boolean;
  readyToGetSummary: boolean;
  currentPrompt?: string;
  summaryPrompt?: string;
  crossPollination?: boolean;
}

export default function SessionResultControls({
  id,
  isFinished,
  readyToGetSummary,
  currentPrompt = '',
  summaryPrompt = '',
  crossPollination = true,
}: SessionResultControlsProps) {
  const [loadSummary, setLoadSummary] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
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
    await createSummary(id);
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
            disabled={loadSummary || isCloning}
          >
            {isFinished ? 'Reopen' : 'Finish'}
          </Button>
          {readyToGetSummary && (
            <Button
              variant="secondary"
              onClick={updateSummary}
              disabled={loadSummary || isCloning}
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
            disabled={isCloning}
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
      </CardContent>
    </Card>
  );
}
