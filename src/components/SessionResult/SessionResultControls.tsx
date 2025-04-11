'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Settings, Copy } from 'lucide-react';
import * as db from '@/lib/db';
import { createSummary } from '@/lib/serverUtils';
import { cloneSession } from '@/lib/serverUtils';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { encryptId } from '@/lib/encryptionUtils';

interface SessionResultControlsProps {
  id: string;
  isFinished: boolean;
  readyToGetSummary: boolean;
}

export default function SessionResultControls({
  id,
  isFinished,
  readyToGetSummary,
}: SessionResultControlsProps) {
  const [loadSummary, setLoadSummary] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  const finishSession = async () => {
    await db.deactivateHostSession(id);
  };

  const reopenSession = async () => {
    console.log('Reopening session')
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
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => isFinished ? reopenSession() : finishSession()}
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
              Update Summary
              {loadSummary && (
                <LoaderCircle className="ml-2 w-4 h-4 animate-spin" />
              )}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleCloneSession}
            disabled={isCloning}
          >
            {isCloning ? (
              <LoaderCircle className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Copy className="mr-2 w-4 h-4" />
            )}
            Clone Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
