'use client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import SessionSummaryCard from '@/components/SessionResult/SessionSummaryCard';
import { HostSession, UserSession } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { LinkIcon, Pencil, Plus } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';

interface SessionInsightsGridProps {
  hostSessions: HostSession[];
  userData: UserSession[];
  workspaceId: string;
  isPublicAccess?: boolean;
  showEdit?: boolean;
}

export default function SessionInsightsGrid({
  hostSessions,
  userData,
  workspaceId,
  isPublicAccess = false,
  showEdit = false,
}: SessionInsightsGridProps) {

  const { hasMinimumRole } = usePermissions(workspaceId);
  
  return (
    <Card className="mt-4 relative group">
      {/* Edit Button - Displayed on hover or always if showEdit is true */}
      <div
        className={`absolute top-2 right-2 z-20 ${
          showEdit ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/10 hover:bg-white/20 border border-gray-200"
          onClick={() => console.log('Edit SessionInsightsGrid clicked')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <CardHeader>
        <h2 className="text-2xl font-semibold">Individual Session Insights</h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Host Sessions cards at the top */}
          {hostSessions.map((hostData) => (
            <SessionSummaryCard
              key={hostData.id}
              hostData={hostData}
              userData={userData.filter(
                (user) => user.session_id === hostData.id
              )}
              workspace_id={workspaceId}
              id={hostData.id}
              usePublicAccess={isPublicAccess}
            />
          ))}
          
          {hasMinimumRole('owner') &&
            <>
              <Card className="border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] space-y-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Create New Session</h3>
                    <p className="text-sm text-gray-500">
                      Start a new discussion session from scratch
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Link Existing Session Card */}
              <Card className="border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px] space-y-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <LinkIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">
                      Link Existing Session
                    </h3>
                    <p className="text-sm text-gray-500">
                      Connect an existing session to this workspace
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          }
        </div>
      </CardContent>
    </Card>
  );
}
