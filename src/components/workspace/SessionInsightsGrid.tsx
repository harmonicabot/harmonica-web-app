import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import { HostSession, UserSession } from '@/lib/schema';

interface SessionInsightsGridProps {
  hostSessions: HostSession[];
  userData: UserSession[];
  workspaceId: string;
  isPublicAccess?: boolean;
}

export default function SessionInsightsGrid({
  hostSessions,
  userData,
  workspaceId,
  isPublicAccess = false,
}: SessionInsightsGridProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <h2 className="text-2xl font-semibold">
          Individual Session Insights
        </h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostSessions.map((hostData) => (
            <SessionSummaryCard
              key={hostData.id}
              hostData={hostData}
              userData={userData.filter((user) => user.session_id === hostData.id)}
              workspace_id={workspaceId}
              id={hostData.id}
              usePublicAccess={isPublicAccess}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 