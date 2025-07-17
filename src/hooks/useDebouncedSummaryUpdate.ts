import { useCallback, useEffect, useRef } from 'react';
import { createSummary, createMultiSessionSummary } from '@/lib/serverUtils';
import { mutate } from 'swr';

type Options = {
  delay?: number;
  isProject?: boolean;
  sessionIds?: string[];     // for workspace summary
  projectId?: string;        // workspace id
  onComplete?: () => void;   // notify UI when done
};

export function useDebouncedSummaryUpdate(
  resourceId: string,        // sessionId or projectId
  {
    delay = 30_000,          // 30s
    isProject = false,
    sessionIds = [],
    projectId,
    onComplete,
  }: Options = {},
) {
  const timer = useRef<NodeJS.Timeout | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    cancel();                                    // restart previous runs if a new update is scheduled
    timer.current = setTimeout(async () => {
      try {
        if (isProject) {
          await createMultiSessionSummary(
            sessionIds.length ? sessionIds : [resourceId],
            projectId ?? resourceId,
          );
        } else {
          await createSummary(resourceId);
        }
        mutate(location.pathname);                // refresh SWR
        onComplete?.();
      } catch (e) {
        console.error('Summary update failed', e);
      } finally {
        timer.current = null;
      }
    }, delay);
  }, [cancel, delay, isProject, resourceId, sessionIds, projectId, onComplete]);

  // clear on unmount
  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
