import { Metadata } from 'next';
import { getGeneratedMetadata } from 'app/api/metadata';
import { ResultTabsVisibilityConfig } from '@/lib/types';
import WorkspaceContent from './WorkspaceContent';
import ErrorPage from '@/components/Error';
import { fetchWorkspaceData } from '@/lib/workspaceData';

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

export default async function Workspace({
  params,
  searchParams,
}: {
  params: { w_id: string };
  searchParams: { access?: string };
}) {
  const isPublicAccess = searchParams.access === 'public';

  try {
    const data = await fetchWorkspaceData(params.w_id);
    
    // If public access is requested but workspace isn't public, show error
    if (isPublicAccess && data.workspaceData?.is_public === false) {
      return (
        <ErrorPage
          title="Access Denied"
          message="This workspace is not publicly accessible."
        />
      );
    }

    return (
      <div className="p-4 md:p-8">
        <WorkspaceContent
          {...data}
          workspaceId={params.w_id}
          isPublicAccess={isPublicAccess}
        />
      </div>
    );
  } catch (error) {
    console.error(`Error occurred fetching data: `, error);
    return (
      <ErrorPage
        title={'Error loading workspace'}
        message={'The workspace could not be loaded.'}
      />
    );
  }
}