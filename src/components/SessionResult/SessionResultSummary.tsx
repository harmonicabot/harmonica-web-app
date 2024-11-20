import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HRMarkdown } from '@/components/HRMarkdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { RefreshCw } from 'lucide-react';

interface SessionResultSummaryProps {
  summary: string;
  hasNewMessages: boolean;
  onUpdateSummary: () => void;
}

export default function SessionResultSummary({
  summary,
  hasNewMessages,
  onUpdateSummary,
}: SessionResultSummaryProps) {
  
  return (
    <Card className="h-full relative">
      {hasNewMessages && (
        <TooltipProvider>
          <Tooltip delayDuration={50}>
            <TooltipTrigger className="absolute top-4 right-4">
              <RefreshCw
                onClick={onUpdateSummary}
                className="absolute top-4 right-4 h-4 w-4 cursor-pointer hover:text-primary"
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
            >
              <p>New responses available. Update summary!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <CardContent>{summary && <HRMarkdown content={summary} />}</CardContent>
    </Card>
  );
}
