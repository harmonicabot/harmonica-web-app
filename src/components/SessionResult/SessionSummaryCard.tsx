import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { HostSession, UserSession } from '@/lib/schema';
import { intlFormatDistance } from 'date-fns';
import { encryptId } from '@/lib/encryptionUtils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function SessionSummaryCard({
  hostData,
  userData,
  workspace_id,
  id,
  onRemove,
}: {
  hostData: HostSession;
  userData: UserSession[];
  workspace_id: string;
  id: string;
  onRemove?: (sessionId: string) => void;
}) {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the Link from navigating
    e.stopPropagation(); // Stop event propagation

    if (onRemove) {
      if (confirm(`Remove "${hostData.topic}" from this workspace?`)) {
        onRemove(id);
      }
    }
  };
  // Not 100% what we use elsewhere (where we actually check for how many users have sent more than 2 messages);
  // but maybe good enough for now.
  const totalUsers = userData.filter(user => user.include_in_summary).length;
  
  const status = 
            !hostData.active || hostData.final_report_sent
              ? "FINISHED"
              : totalUsers === 0
              ? "DRAFT"
              : "ACTIVE";

  return (
    <div className="relative group">
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-white shadow-md border opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={handleRemove}
          aria-label="Remove session"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <Link href={`/workspace/${workspace_id}/${encryptId(id)}`}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="text-xl truncate">{hostData.topic}</span>
            </CardTitle>
            {hostData.goal && (
              <div>
                <dt className="text-sm text-gray-500">Objective</dt>
                <p className="text-sm mt-2 line-clamp-2">{hostData.goal}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Participants</dt>
                <dd className="text-2xl font-semibold">{userData.length}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="text-sm">
                  {Date.now() - new Date(hostData.start_time).getTime() >
                  7 * 24 * 60 * 60 * 1000
                    ? new Date(hostData.start_time).toLocaleDateString()
                    : intlFormatDistance(
                        new Date(hostData.start_time),
                        new Date()
                      )}
                </dd>
              </div>
              <div>
                <Badge
                  variant="outline"
                  className={`${
                    status === 'ACTIVE' ? 'bg-lime-100 text-lime-900'
                      : status === 'DRAFT' ? 'bg-purple-100 text-purple-900' 
                      : '' // Finished, remain white
                  }`}
                >
                  {status}
                </Badge>
              </div>
            </dl>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
