import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Download, RefreshCw, Edit2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Button } from '../ui/button';
import { ExportButton } from '../Export/ExportButton';
import { Spinner } from '../icons';
import { RefreshStatus, SummaryUpdateManager } from 'summary/SummaryUpdateManager';
import { useRef } from 'react';
import { cn } from '@/lib/clientUtils';

interface SummaryCardProps {
  resourceId: string;
  title: string;
  content?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  onEditPrompt?: () => void;
  isUpdating?: boolean;
  loading?: boolean;
  className?: string;
}

const StatusIndicator = ({ status }: { status: RefreshStatus | undefined }) => {
  const getStatusColor = () => {
    switch (status) {
      case RefreshStatus.UpToDate:
        return 'bg-lime-200';
      case RefreshStatus.Outdated:
        return 'bg-red-500';
      case RefreshStatus.UpdatePending:
        return 'bg-yellow-500 animate-pulse';
      case RefreshStatus.Unknown:
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
  );
};

export const SummaryCard = ({
  resourceId,
  title,
  content,
  showRefreshButton,
  onRefresh,
  onEditPrompt,
  isUpdating,
  loading,
  className,
}: SummaryCardProps) => {
  const refreshStatusRef = useRef(SummaryUpdateManager.getState(resourceId).status);

  // Only update if status actually changes
  SummaryUpdateManager.subscribe(resourceId, (state) => {
    console.log("[SummaryCard]: Updating status: ", state.status);
    refreshStatusRef.current = state.status;
  });

  return (
    <Card className={cn("mb-4", className)}>
      <CardHeader>
        <div className="w-full flex justify-between items-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {content && (
            <div className="flex gap-2">
              {showRefreshButton && onEditPrompt && (
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onEditPrompt}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                      <p>Edit Summary Prompt</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <ExportButton content={content}>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </ExportButton>
              {showRefreshButton && (
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 relative ${
                          refreshStatusRef.current === RefreshStatus.UpdatePending
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                        onClick={!isUpdating ? onRefresh : undefined}
                        disabled={isUpdating}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            refreshStatusRef.current === RefreshStatus.UpdatePending || isUpdating
                              ? 'animate-spin'
                              : ''
                          }`}
                        />
                        <div className="absolute -top-1 -right-1">
                          <StatusIndicator status={refreshStatusRef.current} />
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                      {isUpdating ? (
                        <p>Please wait while a {title} is generated</p>
                      ) : (
                        <div>
                          <p>Refresh {title}</p>
                          {refreshStatusRef.current === RefreshStatus.Unknown && (
                            <p className="text-xs text-gray-600">Unknown update status</p>
                          )}
                          {refreshStatusRef.current === RefreshStatus.UpToDate && (
                            <p className="text-xs text-green-600">Up to date</p>
                          )}
                          {refreshStatusRef.current === RefreshStatus.UpdatePending && (
                            <p className="text-xs text-yellow-600">Auto-refreshing soon</p>
                          )}
                          {refreshStatusRef.current === RefreshStatus.Outdated && (
                            <p className="text-xs text-red-600">Summary out of date</p>
                          )}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="md:p-12">
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              <span>Creating your {title}...</span>
            </div>
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-4/5 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
        ) : (
          <HRMarkdown content={content || ''} />
        )}
      </CardContent>
    </Card>
  );
};

