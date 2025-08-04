import ErrorPage from "@/components/Error";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import * as db from "@/lib/db";
import { fetchWorkspaceDataAction, fetchAvailableSessionsAction } from "./actions";
import WorkspaceContent from "./WorkspaceContent";// Increase the maximum execution time for this function on vercel
import { getGeneratedMetadata } from "app/api/metadata";
import { Metadata } from "next/types";
export const maxDuration = 300; // in seconds
export const revalidate = 0; // Disable caching for this page

export async function generateMetadata({
  params,
}: {
  params: { w_id: string };
}): Promise<Metadata> {
  return getGeneratedMetadata(`/workspace/${params.w_id}`);
}

export default async function Workspace({
  params,
}: {
  params: { w_id: string };
}) {
  const queryClient = new QueryClient();
  
  try {
    // Use the server action for consistency
    const extendedWorkspaceData = await fetchWorkspaceDataAction(params.w_id);
    
    // Set individual query caches for optimal performance
    const { sessionIds, hostSessions, userData } = extendedWorkspaceData;
    
    // Create allUserData structure for cache population
    const allUserData = sessionIds.map(sessionId => 
      userData.filter(user => user.session_id === sessionId)
    );
    
    sessionIds.forEach((id, index) => {
      queryClient.setQueryData(['host', id], hostSessions[index]);
      queryClient.setQueryData(['users', id], allUserData[index]);
    });
    
    // Set workspace-specific caches
    queryClient.setQueryData(['workspace-sessions', params.w_id], sessionIds);
    queryClient.setQueryData(['available-sessions'], extendedWorkspaceData.availableSessions);
    queryClient.setQueryData(['workspace', params.w_id], extendedWorkspaceData);
    
    // Continue with additional prefetch queries for performance optimization
    if (sessionIds.length > 0) {
      console.log(`Prefetching workspace data for ${sessionIds.length} sessions...`);
      
      const stats = await db.getNumUsersAndMessages(sessionIds);
      queryClient.setQueryData(['workspace-stats', sessionIds.sort()], stats);
      
      await Promise.allSettled([
        // These will use cached data if available
        ...sessionIds.map(id => 
          queryClient.prefetchQuery({
            queryKey: ['host', id],
            queryFn: () => db.getHostSessionById(id)
          })
        ),
        ...sessionIds.map(id => 
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
          queryKey: ['workspace-stats', sessionIds.sort()],
          queryFn: () => db.getNumUsersAndMessages(sessionIds)
        }),
        
        // Prefetch available sessions
        queryClient.prefetchQuery({
          queryKey: ['available-sessions'],
          queryFn: () => fetchAvailableSessionsAction()
        })
      ]);
      
      console.log('Prefetching workspaces completed successfully');
    }
    
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="p-4 md:p-8">
          <WorkspaceContent
            extendedWorkspaceData={extendedWorkspaceData}
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