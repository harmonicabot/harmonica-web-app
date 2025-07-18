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

export enum RefreshStatus {
  UpToDate,
  Unknown,
  UpdatePending
}

interface CardProps {
  title: string;
  content?: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  isUpdating?: boolean;
  loading?: boolean;
  className?: string;
  refreshStatus?: RefreshStatus;
}

const StatusIndicator = ({ status }: { status: RefreshStatus }) => {
  const getStatusColor = () => {
    switch (status) {
      case RefreshStatus.UpToDate:
        return 'bg-green-500';
      case RefreshStatus.Unknown:
        return 'bg-red-500';
      case RefreshStatus.UpdatePending:
        return 'bg-orange-500 animate-pulse';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
  );
};

export const ExpandableWithExport = ({
  title,
  content,
  isExpanded,
  onExpandedChange,
  showRefreshButton,
  onRefresh,
  isUpdating,
  loading,
  className,
  refreshStatus = RefreshStatus.UpToDate,
}: CardProps) => {
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
                            isUpdating
                              ? 'animate-spin cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        />
                        <div className="absolute -top-1 -right-1">
                          <StatusIndicator status={refreshStatus} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                      {isUpdating ? (
                        <p>Please wait while a {title} is generated</p>
                      ) : (
                        <div>
                          <p>Refresh {title}</p>
                          {refreshStatus === RefreshStatus.UpdatePending && (
                            <p className="text-xs text-orange-600">Auto-refreshing soon</p>
                          )}
                          {refreshStatus === RefreshStatus.Unknown && (
                            <p className="text-xs text-red-600">Unknown update status</p>
                          )}
                          {refreshStatus === RefreshStatus.UpToDate && (
                            <p className="text-xs text-green-600">Up to date</p>
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
