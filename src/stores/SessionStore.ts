import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '@/lib/db';
import { NewHostSession, NewMessage, NewUserSession, NewWorkspace, Workspace, HostSession, UserSession, User } from '@/lib/schema';
import { fetchWorkspaceData } from '@/lib/workspaceData';
import { linkSessionsToWorkspace, unlinkSessionFromWorkspace } from '@/lib/workspaceActions';
import { checkSummaryNeedsUpdating, fetchSummary, updateUserLastEdit, updateHostLastEdit, updateWorkspaceLastModified } from '@/lib/summaryActions';
import { checkSummaryAndMessageTimes } from '@/lib/clientUtils';
import { createSummary, createMultiSessionSummary } from '@/lib/serverUtils';
import { getSession } from '@auth0/nextjs-auth0';


// --- Query Keys ---
const workspaceKey = (id: string) => ['workspace', id];
const hostKey = (id: string) => ['host', id];
const userKey = (sessionId: string) => ['users', sessionId];
const messageKey = (threadId: string) => ['messages', threadId];
const summaryStatusKey = (sessionId: string) => ['summary-status', sessionId];
const summaryContentKey = (sessionId: string) => ['summary-content', sessionId];
// Workspace-specific query keys
const workspaceSessionsKey = (workspaceId: string) => ['workspace-sessions', workspaceId];
const sessionsStatsKey = (sessionIds: string[]) => ['workspace-stats', sessionIds.sort()];
const availableSessionsKey = () => ['available-sessions'];
const staleTime = 1000 * 60; // 1 minute

// --- Fetchers ---
export function useWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: workspaceKey(workspaceId),
    queryFn: () => fetchWorkspaceData(workspaceId, queryClient),
    select: (data) => data ?? [], // Returns an empty array if data isn't available yet
    enabled: !!workspaceId,
    staleTime,
  });
}

export function useHostSession(sessionId: string) {
  return useQuery({
    queryKey: hostKey(sessionId),
    queryFn: () => db.getHostSessionById(sessionId),
    select: (data) => data ?? [],
    enabled: !!sessionId,
    staleTime,
  });
}

export function useUserSessions(hostSessionId: string) {
  return useQuery({
    queryKey: userKey(hostSessionId),
    queryFn: () => db.getUsersBySessionId(hostSessionId),
    select: (data) => data ?? [],
    enabled: !!hostSessionId,
    staleTime,
  });
}

export function useUserSession(userSessionId: string) {
  return useQuery({
    queryKey: ['user-session', userSessionId],
    queryFn: () => db.getUserSessionById(userSessionId),
    enabled: !!userSessionId,
    staleTime,
  });
}

export function useMessages(threadId: string) {
  return useQuery({
    queryKey: messageKey(threadId),
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
    queryFn: async () => {
      // Move getAllAvailableSessionIds logic here
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
    },
    staleTime,
  });
}

export function useAvailableWorkspaces() {
  return useQuery({
    queryKey: ['available-workspaces-for-user'],
    queryFn: async () => {
      const session = await getSession();
      const userId = session?.user?.sub;
      
      if (!userId) {
        return [];
      }
      
      const resources = await db.getResourcesForUser(userId, 'WORKSPACE');
      if (!resources.length) return [];
      
      const workspaceIds = resources.map(resource => resource.resource_id);
      return await db.getWorkspacesForIds(workspaceIds, ['id', 'title']);
    },
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
      queryClient.invalidateQueries({ queryKey: workspaceKey(variables.id) });
    },
  });
}

export function useUpsertHostSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewHostSession) => db.upsertHostSession(data, 'update'),
    onSuccess: (result, _data) => {
      queryClient.invalidateQueries({ queryKey: hostKey(result.id) });
    },
  });
}

export function useUpsertUserSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewUserSession) => {
      if (!data.id) {
        return await db.insertUserSessions(data);
      } else {
        return await db.updateUserSession(data.id, data);
      }
    },
    onSuccess: (result, _input) => {
      result.forEach(userSessionId => {
        queryClient.invalidateQueries({ queryKey: userKey(userSessionId) });
      });
      // Also invalidate summary status for the host session, as user edits affect it
      userSessions.forEach(userSession => {
        if (userSession.host_session_id) {
          queryClient.invalidateQueries({ queryKey: summaryStatusKey(userSession.host_session_id) });
        }
      });
    },
  });
}

export function useInsertMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: NewMessage) => db.insertChatMessage(message),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: messageKey(input.thread_id) });
    },
  });
}

export function useRemoveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => db.deleteSessionById(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: hostKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: userKey(sessionId) });
      // Invalidate available sessions since this session was deleted
      queryClient.invalidateQueries({ queryKey: availableSessionsKey() });
      // Invalidate all workspace queries since they might reference this session
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
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
      queryClient.invalidateQueries({ queryKey: workspaceKey(variables.workspaceId) });
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
      queryClient.invalidateQueries({ queryKey: workspaceKey(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceSessionsKey(variables.workspaceId) });
      // Invalidate workspace stats for the new session configuration
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });
}

// --- Summary Operations ---


export function useSummaryStatus(resourceId: string, isProject = false) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: summaryStatusKey(resourceId),
    queryFn: async () => {
      // For projects, we need different caching strategy
      if (isProject) {
        // For workspaces, check if we have workspace data cached
        // const cachedWorkspace = queryClient.getQueryData(workspaceKey(sessionId));
        // No workspace cache, fallback to server action
        return checkSummaryNeedsUpdating(resourceId, true);
      }
      
      // For sessions, try to use cached data first to avoid database calls
      const cachedHost = queryClient.getQueryData<HostSession>(hostKey(resourceId));
      const cachedUsersForResource = queryClient.getQueryData<UserSession[]>(userKey(resourceId));
      const cachedUsersIndividual = cachedUsersForResource?.map(user => queryClient.getQueryData<UserSession[]>(userKey(user.id)));
      
      if (cachedHost && cachedUsersForResource) {
        const { lastMessage, lastSummaryUpdate } = checkSummaryAndMessageTimes(cachedHost, cachedUsersForResource);
        const lastUserEdit = cachedUsersForResource.reduce((latest: number, user: UserSession) => {
          const lastEditTime = new Date(user.last_edit).getTime();
          return lastEditTime > latest ? lastEditTime : latest;
        }, 0);
        console.log(`[i] Cached Summary status for ${resourceId}: Last User Edit: ${lastUserEdit}`);
        return {
          lastEdit: Math.max(lastMessage, lastUserEdit),
          lastSummaryUpdate,
          resourceId: resourceId
        };
      }

      // Fallback to server action if no cached data
      const results = await checkSummaryNeedsUpdating(resourceId, false);
      console.log(`[i] Server Summary status: Last ediy: ${results.lastEdit}, Last Summary Update: ${results.lastSummaryUpdate}`);
      return results;
    },
    enabled: !!resourceId,
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

export function useSummaryContent(sessionId: string) {
  return useQuery({
    queryKey: summaryContentKey(sessionId),
    queryFn: () => fetchSummary(sessionId),
    enabled: !!sessionId,
    staleTime,
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
      queryClient.invalidateQueries({ queryKey: hostKey(variables.resourceId) });
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
      queryClient.invalidateQueries({ queryKey: hostKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: summaryStatusKey(sessionId) });
    },
  });
}

export function useUpdateWorkspaceLastModified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => updateWorkspaceLastModified(workspaceId),
    onSuccess: (_result, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceId) });
      queryClient.invalidateQueries({ queryKey: summaryStatusKey(workspaceId) });
    },
  });
}