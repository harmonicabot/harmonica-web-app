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

interface SessionResultSummaryProps {
  hostData: HostSession;
  newSummaryContentAvailable: boolean;
  onUpdateSummary: () => void;
}

export default function SessionResultSummary({
  hostData,
  newSummaryContentAvailable,
  onUpdateSummary,
}: SessionResultSummaryProps) {
  return (
    <>
      {hostData.prompt_summary && (
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
                  onClick={onUpdateSummary}
                  className="absolute top-4 right-4 h-4 w-4 cursor-pointer hover:text-primary"
                />
              </TooltipTrigger>
              <TooltipContent side="top" align="end">
                <p>New responses available. Update summary!</p>
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
