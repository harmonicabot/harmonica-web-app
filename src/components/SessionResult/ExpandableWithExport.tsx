import { CardContent, CardTitle } from '@/components/ui/card';
import { HRMarkdown } from '@/components/HRMarkdown';
import ExpandableCard from '../ui/expandable-card';
import { Spinner } from '../icons';

interface CardProps {
  resourceId: string;
  title: string;
  content?: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  loading?: boolean;
  className?: string;
}

export const ExpandableWithExport = ({
  resourceId,
  title,
  content,
  isExpanded,
  onExpandedChange,
  loading,
  className,
}: CardProps) => {
  return (
    <ExpandableCard
      title={
        <div className="w-full flex justify-between items-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
        </div>
      }
      defaultExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      className={className}
      maxHeight="9999px"
    >
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              <span>Loading your {title}...</span>
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
    </ExpandableCard>
  );
};
