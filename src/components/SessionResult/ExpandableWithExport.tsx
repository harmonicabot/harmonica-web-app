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
import { RefreshStatus, SummaryUpdateManager } from 'summary/SummaryUpdateManager';
import { useRef } from 'react';

interface CardProps {
  resourceId: string;
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
  const refreshStatusRef = useRef(SummaryUpdateManager.getState(resourceId).status);

  // Only update if status actually changes
  SummaryUpdateManager.subscribe(resourceId, (state) => {
    console.log("[ExpandableComponent]: Updating status: ", state.status);
    refreshStatusRef.current = state.status;
  });
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
                            refreshStatusRef.current === RefreshStatus.UpdatePending
                              ? 'animate-spin cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        />
                        <div className="absolute -top-1 -right-1">
                          <StatusIndicator status={refreshStatusRef.current} />
                        </div>
                      </div>
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
