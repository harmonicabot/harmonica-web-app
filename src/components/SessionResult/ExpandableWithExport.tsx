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

interface CardProps {
  title: string;
  content?: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  exportTooltip: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  isUpdating?: boolean;
  loading?: boolean;
  className?: string;
}

export const ExpandableWithExport = ({
  title,
  content,
  isExpanded,
  onExpandedChange,
  exportTooltip,
  showRefreshButton,
  onRefresh,
  isUpdating,
  loading,
  className,
}: CardProps) => {
  return (
    <ExpandableCard
      title={
        <div className="w-full flex justify-between items-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {isExpanded && content && (
            <ExportButton content={content}>
              <button className="flex gap-2">
                <TooltipProvider>
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger>
                      <Download className="h-5 w-5 text-gray-500 hover:text-blue-500" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end">
                      {exportTooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {showRefreshButton && (
                  <TooltipProvider>
                    <Tooltip delayDuration={50}>
                      <TooltipTrigger>
                        <RefreshCw
                          onClick={!isUpdating ? onRefresh : undefined}
                          className={`h-5 w-5 text-gray-500 cursor-pointer hover:text-primary ${
                            isUpdating
                              ? 'animate-spin cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" align="end">
                        {isUpdating ? (
                          <p>Please wait while a {title} is generated</p>
                        ) : (
                          <p>New responses available. Update {title}!</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </button>
            </ExportButton>
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
