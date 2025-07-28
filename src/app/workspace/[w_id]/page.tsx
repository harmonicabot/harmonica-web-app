import { Metadata } from 'next';
import { getGeneratedMetadata } from 'app/api/metadata';
import WorkspaceContent from './WorkspaceContent';
import ErrorPage from '@/components/Error';
import { fetchWorkspaceData } from '@/lib/workspaceData';
import { ExtendedWorkspaceData } from '@/lib/types';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import * as db from '@/lib/db';
import { getSession } from '@auth0/nextjs-auth0';

// Increase the maximum execution time for this function on vercel
// export const maxDuration = 300; // in seconds
// export const revalidate = 0; // Disable caching for this page


// export async function generateMetadata({
//   params,
// }: {
//   params: { w_id: string };
// }): Promise<Metadata> {
//   return getGeneratedMetadata(`/workspace/${params.w_id}`);
// }

export default async function Workspace({
  params,
}: {
  params: { w_id: string };
}) {
  const queryClient = new QueryClient();
  console.log(`Call stack in Workspace page.tsx:`, new Error("Debugging Workspace Page").stack);

  try {
    // First prefetch workspace data
    await queryClient.prefetchQuery({
      queryKey: ['workspace', params.w_id],
      queryFn: () => fetchWorkspaceData(params.w_id, queryClient)
    });
    
    // Get the cached workspace data to access session IDs for further prefetching
    const data: ExtendedWorkspaceData = queryClient.getQueryData(['workspace', params.w_id])!;
    
    // Only prefetch individual session data if workspace exists and has sessions
    if (data.exists && data.sessionIds.length > 0) {
      console.log(`Prefetching data for ${data.sessionIds.length} sessions...`);
      
      await Promise.allSettled([
        // Prefetch all individual session data for cache reuse
        ...data.sessionIds.map(id => 
          queryClient.prefetchQuery({
            queryKey: ['host', id],
            queryFn: () => db.getHostSessionById(id)
          })
        ),
        ...data.sessionIds.map(id => 
          queryClient.prefetchQuery({
            queryKey: ['users', id],
            queryFn: () => db.getUsersBySessionId(id)
          })
        ),
        
        // Prefetch workspace-specific data
        queryClient.prefetchQuery({
          queryKey: ['workspace-sessions', params.w_id],
          queryFn: () => db.getWorkspaceSessionIds(params.w_id)
        }),
        
        queryClient.prefetchQuery({
          queryKey: ['workspace-stats', data.sessionIds.sort()],
          queryFn: () => db.getNumUsersAndMessages(data.sessionIds)
        }),
        
        // Prefetch available sessions
        queryClient.prefetchQuery({
          queryKey: ['available-sessions'],
          queryFn: async () => {
            const session = await getSession();
            const userId = session?.user?.sub;    
            const availableResources = await db.getResourcesForUser(userId, "SESSION", ["resource_id"]);
            const availableSessionsIds = availableResources.map((r) => r.resource_id).filter((id) => id !== 'global');
            
            if (availableSessionsIds.length > 0) {
              return await db.getHostSessionsForIds(availableSessionsIds, [
                'id', 'topic', 'start_time'
              ]);
            }
            return [];
          }
        })
      ]);
      
      console.log('Prefetching completed successfully');
    }
    
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="p-4 md:p-8">
          <WorkspaceContent
            extendedWorkspaceData={data}
            workspaceId={params.w_id}
          />
        </div>
      </HydrationBoundary>
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