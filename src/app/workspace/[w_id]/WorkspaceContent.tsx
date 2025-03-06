'use client';

import ResultTabs from '@/components/SessionResult/ResultTabs';
import WorkspaceHero from '@/components/workspace/WorkspaceHero';
import SessionInsightsGrid from '@/components/workspace/SessionInsightsGrid';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LinkIcon, Plus } from 'lucide-react';
import InviteUsers from '@/components/workspace/InviteUsers';
import { VisibilitySettings } from '@/components/SessionResult/ResultTabs/components/VisibilitySettings';
import * as db from '@/lib/db';
import { ResultTabsVisibilityConfig } from '@/lib/types';
import { HostSession, UserSession } from '@/lib/schema';

interface WorkspaceContentProps {
  exists: boolean;
  workspaceData?: {
    id: string;
    title?: string;
    description?: string;
    location?: string;
    is_public?: boolean;
    visibility_settings?: ResultTabsVisibilityConfig;
  };
  hostSessions: HostSession[];
  userData: UserSession[];
  sessionIds: string[];
  workspaceId: string;
  isPublicAccess?: boolean;
  visibilityConfig: ResultTabsVisibilityConfig;
}

export default function WorkspaceContent({
  exists,
  workspaceData,
  hostSessions,
  userData,
  sessionIds,
  workspaceId,
  isPublicAccess,
  visibilityConfig,
}: WorkspaceContentProps) {
  return (
    <>
      <div className="flex justify-between items-start">
        <WorkspaceHero
          workspaceId={workspaceId}
          exists={exists}
          title={workspaceData?.title}
          description={workspaceData?.description}
          location={workspaceData?.location}
          isEditable={true} // TODO: Check user permissions
        />
        {exists && !isPublicAccess && (
          <div className="flex gap-2">
            <InviteUsers workspaceId={workspaceId} />
            <VisibilitySettings
              config={workspaceData?.visibility_settings || visibilityConfig}
              onChange={async (newConfig) => {
                await db.updateVisibilitySettings(workspaceId, newConfig);
              }}
              isWorkspace={true}
            />
          </div>
        )}
      </div>
      
      {exists ? (
        // Existing workspace view
        <>
          <div className="mt-8 flex flex-col lg:flex-row gap-4">
            <ResultTabs
              hostData={hostSessions}
              userData={userData}
              id={workspaceId}
              isWorkspace={true}
              hasNewMessages={false}
              visibilityConfig={workspaceData?.visibility_settings || visibilityConfig}
              sessionIds={sessionIds}
              chatEntryMessage={{
                role: 'assistant',
                content: `Bienvenue au Sommet IA de l'ENS-PSL! Je suis là pour vous aider à comprendre les enseignements des discussions précédentes.

Voici quelques questions que vous pourriez poser :
  - Quels ont été les thèmes principaux abordés lors des sessions ?
  - Comment les participants ont-ils perçu le rôle de l'IA dans l'éducation ?
  - Quelles étaient les principales préoccupations concernant l'adoption de l'IA ?
  
You can also ask me in any other language, and I will try my best to reply in your language. (However, I might not always get that right 😅)`,
              }}
            />
          </div>

          <SessionInsightsGrid
            hostSessions={hostSessions}
            userData={userData}
            workspaceId={workspaceId}
            isPublicAccess={isPublicAccess}
          />
        </>
      ) : (
        // New workspace view - Configure Sessions section
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Configure Sessions</h2>
            <p className="text-sm text-gray-500">Add sessions to your new workspace</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create New Session Card */}
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
                    <h3 className="font-semibold mb-2">Link Existing Session</h3>
                    <p className="text-sm text-gray-500">
                      Connect an existing session to this workspace
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
} 