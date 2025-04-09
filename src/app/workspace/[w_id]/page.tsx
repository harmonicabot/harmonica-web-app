import { Metadata } from 'next';
import { getGeneratedMetadata } from 'app/api/metadata';
import WorkspaceContent from './WorkspaceContent';
import ErrorPage from '@/components/Error';
import { fetchWorkspaceData } from '@/lib/workspaceData';
import { ExtendedWorkspaceData } from '@/lib/types';
import { cache } from 'react';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 300; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

// Create a cached version of fetchWorkspaceData
const cachedFetchWorkspaceData = cache(async (workspaceId: string): Promise<ExtendedWorkspaceData> => {
  return fetchWorkspaceData(workspaceId);
});

export async function generateMetadata({
  params,
}: {
  params: { w_id: string };
}): Promise<Metadata> {
  return getGeneratedMetadata(`/workspace/${params.w_id}`);
}

export default async function Workspace({
  params,
  searchParams,
}: {
  params: { w_id: string };
  searchParams: { access?: string };
}) {
  const isPublicAccess_deprecated = searchParams.access === 'public';

  try {
    const data: ExtendedWorkspaceData = await cachedFetchWorkspaceData(params.w_id);
    
    // If public access is requested but workspace isn't public, show error
    if (isPublicAccess_deprecated && data.workspace?.is_public === false) {
      throw new Error('This workspace is not publicly accessible.');
    }

    return (
      <div className="p-4 md:p-8">
        <WorkspaceContent
          extendedWorkspaceData={data}
          workspaceId={params.w_id}
          isPublicAccess_deprecated={isPublicAccess_deprecated}
        />
      </div>
    );
  } catch (error) {
    console.error(`Error occurred fetching data: `, error);
    
    // Check if this is an access denied error
    if (error instanceof Error && error.message.includes('Access denied')) {
      // Allow the error to propagate to the error.tsx boundary
      throw error;
    }
    
    // For other errors, show the error page component
    return (
      <ErrorPage
        title={'Error loading workspace'}
        message={'The workspace could not be loaded.'}
      />
    );
  }
}