import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface';
import { getGeneratedMetadata } from 'app/api/metadata';
import { decryptId } from '@/lib/encryptionUtils';
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query';
import * as db from '@/lib/db';
import { checkSummaryNeedsUpdating, fetchSummary } from '@/lib/summaryActions';
import SessionPage from '@/components/SessionPage';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 0; // Disable caching for this page

export async function generateMetadata(
  { params }: { params: { id: string } } ,
): Promise<Metadata> {
  return getGeneratedMetadata(`/sessions/${params.id}`);
}

export default async function SessionResult({
  params,
}: {
  params: { id: string };
}) {
  const decryptedId = decryptId(params.id);
  const queryClient = new QueryClient();
  console.debug(new Error("Debugging Session Page").stack);

  // Prefetch all session-related data for optimal performance
  // (This is a server component, data is being prefetched on the server and then dehydrated, passed to the client and then further updates will happen there)
  // TanStack is taking care of the hydration magic.
  try {
    console.log(`Prefetching data...`);

    await Promise.allSettled([
      // Prefetch host session data
      queryClient.prefetchQuery({
        queryKey: ['host', decryptedId],
        queryFn: () => db.getHostSessionById(decryptedId),
      }),
      
      // Prefetch user sessions
      queryClient.prefetchQuery({
        queryKey: ['users', decryptedId],
        queryFn: () => db.getUsersBySessionId(decryptedId),
      }),
      
      // Prefetch summary status (for summary update manager)
      queryClient.prefetchQuery({
        queryKey: ['summary-status', decryptedId],
        queryFn: () => checkSummaryNeedsUpdating(decryptedId),
      }),
      
      // Prefetch summary content
      queryClient.prefetchQuery({
        queryKey: ['summary-content', decryptedId],
        queryFn: () => fetchSummary(decryptedId),
      }),
    ]);
  } catch (error) {
    // If prefetching fails, continue rendering - the client will fetch data as needed
    console.warn('Failed to prefetch session data:', error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SessionPage
        sessionId={decryptedId}
      />
    </HydrationBoundary>
  );
}