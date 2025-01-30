import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HRMarkdown } from '@/components/HRMarkdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { RefreshCw } from 'lucide-react';
import { HostSession } from '@/lib/schema';
import { Spinner } from '../icons';
import ExpandableCard from '../ui/expandable-card';
import { use, useEffect, useState } from 'react';
import { createSummary } from '@/lib/serverUtils';

interface SessionResultSummaryProps {
  hostData: HostSession;
  newSummaryContentAvailable: boolean;
  onUpdateSummary: () => void;
  showSessionRecap: boolean;
}

export default function SessionResultSummary({
  hostData,
  newSummaryContentAvailable,
  onUpdateSummary,
  showSessionRecap = true,
}: SessionResultSummaryProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const triggerSummaryUpdate = () => {
    setIsUpdating(true);
    createSummary(hostData.id).then(() => {
      setIsUpdating(false);
      onUpdateSummary();
    });
  };

  return (
    <>
      {hostData.prompt_summary && showSessionRecap&& (
        <div className="mb-4">
        <ExpandableCard title="Session Recap">
          <HRMarkdown content={hostData.prompt_summary}/>
        </ExpandableCard>
        </div>
      )}
      <Card className="h-full relative">
        {newSummaryContentAvailable && (
          <TooltipProvider>
            <Tooltip delayDuration={50}>
              <TooltipTrigger className="absolute top-4 right-4">
                <RefreshCw
                  onClick={!isUpdating
                    ? triggerSummaryUpdate
                    : undefined}
                  className={`absolute top-4 right-4 h-4 w-4 cursor-pointer hover:text-primary ${
                    isUpdating ? 'animate-spin cursor-not-allowed opacity-50' : ''
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" align="end">
                {isUpdating
                  ? <p>Please wait while a new summary is generated</p>
                  : <p>New responses available. Update summary!</p>
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <CardContent>
          {hostData.summary ? (
            <HRMarkdown content={hostData.summary} />
          ) : (
            <>
              <Spinner /> Creating your session summary...
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
