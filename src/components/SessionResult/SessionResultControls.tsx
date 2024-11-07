'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface SessionResultControlsProps {
  id: string;
  isFinished: boolean;
  readyToGetSummary: boolean;
  createSummary: () => Promise<void>;
}

export default function SessionResultControls({
  id,
  isFinished,
  readyToGetSummary,
  createSummary: createSummary,
}: SessionResultControlsProps) {
  const [loadSummary, setLoadSummary] = useState(false);

  const updateSummary = async () => {
    setLoadSummary(true);
    await createSummary();
    setLoadSummary(false);
  };

  const finishSession = async () => {
    updateSummary();
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
                Get summary
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
