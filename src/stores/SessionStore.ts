import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '@/lib/db';
import { NewHostSession, NewMessage, NewUserSession, NewWorkspace, Workspace, HostSession, UserSession, User } from '@/lib/schema';
import { linkSessionsToWorkspace, unlinkSessionFromWorkspace } from '@/lib/workspaceActions';
import { fetchWorkspaceDataAction, fetchAvailableSessionsAction, fetchAvailableWorkspacesAction } from 'app/workspace/[w_id]/actions';
import { checkSummaryNeedsUpdating, fetchSummary, updateUserLastEdit, updateHostLastEdit, updateWorkspaceLastModified } from '@/lib/summaryActions';
import { createSummary, createMultiSessionSummary } from '@/lib/serverUtils';


// --- Query Keys ---
// Note: resourceId can be wspaceId OR hostId; everything else can only be what it says.
// hostId == hostSessionId, they're used interchangeably
const workspaceObjectKey = (wspaceId: string) => ['workspace-objects', wspaceId];
const hostObjectKey = (hostId: string) => ['host-session-objects', hostId];
const userObjectKey = (userSessionId: string) => ['user-session-objects', userSessionId];

// --- Mapping of hostIds -> userIds ---
const hostToUserIdsKey = (hostId: string) => ['host-user-ids', hostId];

const messagesKey = (threadId: string) => ['messages', threadId];
const summaryStatusKey = (resourceId: string) => ['summary-status', resourceId];
const summaryContentKey = (resourceId: string) => ['summary-content', resourceId];

// Workspace-specific query keys
const workspaceSessionsKey = (workspaceId: string) => ['workspace-sessions', workspaceId];
const sessionsStatsKey = (hostIds: string[]) => ['workspace-stats', hostIds.sort()];
const availableSessionsKey = () => ['available-sessions'];
const staleTime = 1000 * 60; // 1 minute

// --- Fetchers ---
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspaceDataAction(workspaceId),
    select: (data) => data ?? [],
    enabled: !!workspaceId,
    staleTime,
  });
}

export function useHostSession(hostSessionId: string) {
  return useQuery({
    queryKey: hostObjectKey(hostSessionId),
    queryFn: () => db.getHostSessionById(hostSessionId),
    select: (data) => data ?? [],
    enabled: !!hostSessionId,
    staleTime,
  });
}

export function useUserSessions(hostSessionId: string) {
  const queryClient = useQueryClient();
  
  // Fetch user IDs and populate individual user caches in one go
  const userIdsQuery = useQuery({
    queryKey: hostToUserIdsKey(hostSessionId),
    queryFn: async () => {
      const users = await db.getUsersBySessionId(hostSessionId);
      
      // Populate individual user entity caches with the data we already have
      users.forEach(user => {
        queryClient.setQueryData(userObjectKey(user.id), user);
      });
      
      // The return value is what's mapped & cached against the hostSessionId; 
      // we only want to return/map userSessionIds, not whole objects.
      // (We still return all objects later on in the outer return!)
      return users.map(user => user.id);
    },
    enabled: !!hostSessionId,
    staleTime,
  });

  // Get user entities from cache (they should be populated by the query above)
  const userSessions = (userIdsQuery.data || [])
    .map(userId => queryClient.getQueryData<UserSession>(userObjectKey(userId)))
    .filter(Boolean) as UserSession[];

  return {
    data: userSessions,
    isLoading: userIdsQuery.isLoading,
    isError: userIdsQuery.isError,
    error: userIdsQuery.error,
  };
}

export function useUserSession(userSessionId: string) {
  return useQuery({
    queryKey: userObjectKey(userSessionId),
    queryFn: () => db.getUserSessionById(userSessionId),
    enabled: !!userSessionId,
    staleTime,
  });
}

export function useMessages(threadId: string) {
  return useQuery({
    queryKey: messagesKey(threadId),
    queryFn: () => db.getAllChatMessagesInOrder(threadId),
    enabled: !!threadId,
  });
}

// --- Workspace-specific hooks for optimized data fetching ---

export function useWorkspaceSessionIds(workspaceId: string) {
  return useQuery({
    queryKey: workspaceSessionsKey(workspaceId),
    queryFn: () => db.getWorkspaceSessionIds(workspaceId),
    enabled: !!workspaceId,
    staleTime,
  });
}

export function useSessionsStats(sessionIds: string[]) {
  return useQuery({
    queryKey: sessionsStatsKey(sessionIds),
    queryFn: () => db.getNumUsersAndMessages(sessionIds),
    enabled: sessionIds.length > 0,
    staleTime,
  });
}

export function useAvailableSessions() {
  return useQuery({
    queryKey: availableSessionsKey(),
    queryFn: () => fetchAvailableSessionsAction(),
    staleTime,
  });
}

export function useAvailableWorkspaces() {
  return useQuery({
    queryKey: ['available-workspaces-for-user'],
    queryFn: () => fetchAvailableWorkspacesAction(),
    staleTime,
  });
}

// --- Mutations ---
export function useUpsertWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workspace | NewWorkspace> }) =>
      db.upsertWorkspace(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceObjectKey(variables.id) });
    },
  });
}

export function useUpsertHostSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewHostSession) => db.upsertHostSession(data, 'update'),
    onSuccess: (result, _data) => {
      queryClient.invalidateQueries({ queryKey: hostObjectKey(result.id) });
    },
  });
}

export function useUpsertUserSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewUserSession) => {
      if (!data.id) {
        return (await db.insertUserSessions(data))[0];
      } else {
        return (await db.updateUserSession(data.id, data))[0];
      }
    },
    onSuccess: (userSessionId, input) => {
      // Invalidate individual user entity caches
      queryClient.invalidateQueries({ queryKey: userObjectKey(userSessionId) });
      
      // Get host session ID from input data or from local cache to invalidate host-user mapping
      const hostSessionId = input.session_id
        || queryClient.getQueryData<UserSession>(userObjectKey(userSessionId))?.session_id;
      if (hostSessionId) {
        queryClient.invalidateQueries({ queryKey: hostToUserIdsKey(hostSessionId) });
        queryClient.invalidateQueries({ queryKey: summaryStatusKey(hostSessionId) });
      }
    },
  });
}

export function useInsertMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: NewMessage) => db.insertChatMessage(message),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: messagesKey(input.thread_id) });
    },
  });
}

export function useRemoveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => db.deleteSessionById(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: hostObjectKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: userObjectKey(sessionId) });
      // Invalidate available sessions since this session was deleted
      queryClient.invalidateQueries({ queryKey: availableSessionsKey() });
      // Invalidate all workspace queries since they might reference this session
      queryClient.invalidateQueries({ queryKey: ['workspace-object'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });
}

export function useLinkSessionsToWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, sessionIds }: { workspaceId: string; sessionIds: string[] }) =>
      await linkSessionsToWorkspace(workspaceId, sessionIds),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceObjectKey(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceSessionsKey(variables.workspaceId) });
      // Invalidate workspace stats for the new session configuration
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });
}

export function useUnlinkSessionFromWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId, sessionId }: { workspaceId: string; sessionId: string }) =>
      await unlinkSessionFromWorkspace(workspaceId, sessionId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceObjectKey(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceSessionsKey(variables.workspaceId) });
      // Invalidate workspace stats for the new session configuration
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });
}

// --- Summary Operations ---


export function useSummaryStatus(resourceId: string, isProject = false) {  
  return useQuery({
    queryKey: summaryStatusKey(resourceId),
    queryFn: () => {
      console.debug(`Fetching summary status for ${resourceId}`);
      return checkSummaryNeedsUpdating(resourceId, isProject)
    },
    enabled: !!resourceId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });
}

export function useSummary(resourceId: string, initialSummary?: string, isProject = false) {
  return useQuery({
    queryKey: summaryContentKey(resourceId),
    queryFn: () => fetchSummary(resourceId, isProject),
    enabled: !!resourceId,
    initialData: initialSummary,
    staleTime,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, sessionIds }: {
      resourceId: string;
      sessionIds?: string[];
    }) => {
      if (sessionIds && sessionIds.length > 1) {
        return createMultiSessionSummary(
          sessionIds,
          resourceId
        );
      } else {
        return createSummary(resourceId);
      }
    },
    onSuccess: (summary, variables) => {
      // Update cache with new summary content
      queryClient.setQueryData(summaryContentKey(variables.resourceId), summary);
      // Invalidate status to reflect that summary is now up to date
      queryClient.invalidateQueries({ queryKey: summaryStatusKey(variables.resourceId) });
      // Invalidate host session to update last_summary_update timestamp
      queryClient.invalidateQueries({ queryKey: hostObjectKey(variables.resourceId) });
    },
  });
}

export function useUpdateUserLastEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userSessionId: string) => updateUserLastEdit(userSessionId),
    onSuccess: (_result, _userSessionId) => {
      // We need to find which session this user belongs to
      // For now, invalidate all user queries - could be optimized
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['summary-status'] });
    },
  });
}

export function useUpdateHostLastEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => updateHostLastEdit(sessionId),
    onSuccess: (_result, sessionId) => {
      queryClient.invalidateQueries({ queryKey: hostObjectKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: summaryStatusKey(sessionId) });
    },
  });
}

export function useUpdateWorkspaceLastModified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => updateWorkspaceLastModified(workspaceId),
    onSuccess: (_result, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: workspaceObjectKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: summaryStatusKey(workspaceId) });
    },
  });
}