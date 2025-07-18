import useSWR from 'swr';
import { fetchSummary } from '@/lib/summaryActions';

export function useSummary(resourceId: string, initialSummary?: string, isProject = false) {
  return useSWR(
    resourceId ? ['summary-content', resourceId] : null,
    ([_, id]) => fetchSummary(id, isProject),
    { 
      fallbackData: initialSummary,
      revalidateOnFocus: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false
    }
  );
}
