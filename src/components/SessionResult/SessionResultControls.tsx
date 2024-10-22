'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { ApiAction, ApiTarget } from '@/lib/types';
import { sendApiCall, sendCallToMake } from '@/lib/utils';

interface SessionResultControlsProps {
  id: string;
  isFinished: boolean;
  onFinishSession: () => Promise<void>;
}

export default function SessionResultControls({
  id,
  isFinished,
  onFinishSession,
}: SessionResultControlsProps) {
  const [loadSummary, setLoadSummary] = useState(false);

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    setLoadSummary(true);
    await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.CreateSummary,
      data: {
        session_id: id,
        finished: isFinished ? 1 : 0,
      },
    });
  };

  const sendFinalReport = async () => {
    await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.SendFinalReport,
      data: {
        session_id: id,
      },
    });
  };

  const finishSession = async () => {
    await createSummary();
    await sendFinalReport();
    await onFinishSession();
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
              className="me-2"
              onClick={finishSession}
              disabled={loadSummary}
            >
              Finish session
            </Button>
            {/* <Button variant="secondary">Cancel session</Button> */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
