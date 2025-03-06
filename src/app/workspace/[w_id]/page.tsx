import { Metadata } from 'next';
import { getGeneratedMetadata } from 'app/api/metadata';
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';
import { ResultTabsVisibilityConfig } from '@/lib/types';
import WorkspaceContent from './WorkspaceContent';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 300; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

export async function generateMetadata({
  params,
}: {
  params: { w_id: string };
}): Promise<Metadata> {
  return getGeneratedMetadata(`/workspace/${params.w_id}`);
}

// Default visibility configuration for workspaces
const defaultWorkspaceVisibilityConfig: ResultTabsVisibilityConfig = {
  showSummary: true,
  showParticipants: true,
  showCustomInsights: true,
  showChat: true,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

export default async function Workspace({
  params,
  searchParams,
}: {
  params: { w_id: string };
  searchParams: { access?: string };
}) {
  // For public access, we show a more limited view
  const visibilityConfig: ResultTabsVisibilityConfig = searchParams.access === 'public' 
    ? {
        showSummary: true,
        showParticipants: false,
        showCustomInsights: true,
        showChat: true,
        allowCustomInsightsEditing: false,
        showSessionRecap: true,
      }
    : defaultWorkspaceVisibilityConfig;

  return (
    <WorkspaceLayout
      workspaceId={params.w_id}
      isPublicAccess={searchParams.access === 'public'}
    >
      {(data) => (
        <WorkspaceContent
          {...data}
          workspaceId={params.w_id}
          isPublicAccess={searchParams.access === 'public'}
          visibilityConfig={visibilityConfig}
        />
      )}
    </WorkspaceLayout>
  );
}
