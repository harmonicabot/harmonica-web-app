import { CardContent, CardTitle } from '@/components/ui/card';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Download, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import ExpandableCard from '../ui/expandable-card';
import { ExportButton } from '../Export/ExportButton';
import { Spinner } from '../icons';
import { useSummaryUpdateManager } from '@/hooks/useSummaryUpdateManager';
import { RefreshStatus } from '@/lib/summary-update-manager';


interface CardProps {
  resourceId: string;
  sessionIds?: string[],
  title: string;
  content?: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
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
        return 'bg-yellow-500';
      case RefreshStatus.UpdateStarted:
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

export const ExpandableWithExport = ({
  resourceId,
  sessionIds,
  title,
  content,
  isExpanded,
  onExpandedChange,
  showRefreshButton,
  onRefresh,
  isUpdating,
  loading,
  className,
}: CardProps) => {
  console.log(`[HOOK Creation - Expandable] using useSummaryUpdateManager hook`);
  const summaryManager = useSummaryUpdateManager(resourceId, sessionIds);
  return (
    <ExpandableCard
      title={
        <div className="w-full flex justify-between items-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {isExpanded && content && (
            <div className="flex gap-2 cursor-pointer">
              <ExportButton content={content}>
                <Download className="h-5 w-5 text-gray-500 hover:text-blue-500" />
              </ExportButton>
              {showRefreshButton && (
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger>
                      <div className="relative">
                        <RefreshCw
                          onClick={!isUpdating ? onRefresh : undefined}
                          className={`h-5 w-5 text-gray-500 cursor-pointer hover:text-primary ${
                            summaryManager.status === RefreshStatus.UpdatePending || summaryManager.status === RefreshStatus.UpdateStarted
                              ? 'animate-spin cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        />
                        <div className="absolute -top-1 -right-1">
                          <StatusIndicator status={summaryManager.status} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                      {isUpdating ? (
                        <p>Please wait while a {title} is generated</p>
                      ) : (
                        <div>
                          <p>Refresh {title}</p>
                          {summaryManager.status === RefreshStatus.Unknown && (
                            <p className="text-xs text-gray-600">Unknown update status</p>
                          )}
                          {summaryManager.status === RefreshStatus.UpToDate && (
                            <p className="text-xs text-green-600">Up to date</p>
                          )}
                          {summaryManager.status === RefreshStatus.UpdatePending && (
                            <p className="text-xs text-yellow-600">Refreshing soon</p>
                          )}
                          {summaryManager.status === RefreshStatus.UpdateStarted && (
                            <p className="text-xs text-yellow-600">Fetching updates...</p>
                          )}
                          {summaryManager.status === RefreshStatus.Outdated && (
                            <p className="text-xs text-red-600">Out of date</p>
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
      }
      defaultExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      className={className}
    >
      <CardContent className="max-h-[80vh] overflow-auto pb-0">
        {loading ? (
          <>
            <Spinner /> Creating your {title}...
          </>
        ) : (
          <HRMarkdown content={content || ''} />
        )}
      </CardContent>
    </ExpandableCard>
  );
};
