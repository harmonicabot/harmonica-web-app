import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '@/lib/summaryActions';

export function useSummary(resourceId: string, initialSummary?: string, isProject = false) {
  return useQuery({
    queryKey: ['summary-content', resourceId],
    queryFn: () => fetchSummary(resourceId, isProject),
    enabled: !!resourceId,
    initialData: initialSummary,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false,
  });
}
