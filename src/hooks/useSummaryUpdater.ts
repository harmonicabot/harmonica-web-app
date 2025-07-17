import { useCallback, useEffect } from 'react';
import { SummaryUpdateManager, type ManagerOpts } from '../summary/SummaryUpdateManager';

type Options = {
  isProject?: boolean;
  sessionIds?: string[];     // for workspace summary
  projectId?: string;        // workspace id
  onComplete?: () => void;   // notify UI when done
  onEdit?: () => void;       // notify UI when edit is registered
};

export function useSummaryUpdater(
  resourceId: string,        // sessionId or projectId
  {
    isProject = false,
    sessionIds = [],
    projectId,
    onComplete,
    onEdit,
  }: Options = {},
) {
  const managerOpts: ManagerOpts = {
    isProject,
    sessionIds,
    projectId,
    source: 'ui'
  };

  const registerEdit = useCallback(async () => {
    console.log('[useSummaryUpdater] Registering edit via SummaryUpdateManager');
    await SummaryUpdateManager.registerEdit(resourceId, managerOpts);
    onEdit?.();
  }, [resourceId, onEdit]);

  const flushUpdate = useCallback(async () => {
    console.log('[useSummaryUpdater] Flushing update via SummaryUpdateManager');
    await SummaryUpdateManager.updateNow(resourceId, managerOpts);
    onComplete?.();
  }, [resourceId, onComplete]);

  const needsUpdate = useCallback(async () => {
    return await SummaryUpdateManager.needsUpdate(resourceId, isProject);
  }, [resourceId, isProject]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      SummaryUpdateManager.clearState(resourceId);
    };
  }, [resourceId]);

  const state = SummaryUpdateManager.getState(resourceId);

  return { 
    registerEdit, 
    flushUpdate, 
    needsUpdate,
    isRunning: state.isRunning 
  };
}
