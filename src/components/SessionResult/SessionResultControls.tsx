'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Settings } from 'lucide-react';
import * as db from '@/lib/db'
import { createSummary } from '@/lib/serverUtils'

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

  const finishSession = async () => {
    await db.deactivateHostSession(id);
    await createSummary(id);
  };

  const updateSummary = async () => {
    setLoadSummary(true);
    await createSummary(id);
    setLoadSummary(false);
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
        {isFinished ? (
          <p>Session finished</p>
        ) : (
          <div>
            <Button
              className="me-4"
              onClick={finishSession}
              disabled={loadSummary}
            >
              Finish
            </Button>
            {readyToGetSummary && (
              <Button
                variant="secondary"
                onClick={updateSummary}
                disabled={loadSummary}
                >
                  Get Summary
                {loadSummary && <LoaderCircle className='ml-2 w-6 h-6 animate-spin'/>}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
