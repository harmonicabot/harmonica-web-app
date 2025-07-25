import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '@/lib/db';
import { NewHostSession, NewMessage, NewUserSession, NewWorkspace, Workspace } from '@/lib/schema';
import { fetchWorkspaceData } from '@/lib/workspaceData';
import { linkSessionsToWorkspace, unlinkSessionFromWorkspace } from '@/lib/workspaceActions';


// --- Query Keys ---
const workspaceKey = (id: string) => ['workspace', id];
const hostKey = (id: string) => ['host', id];
const userKey = (sessionId: string) => ['users', sessionId];
const messageKey = (threadId: string) => ['messages', threadId];
const staleTime = 1000 * 60; // 1 minute

// --- Fetchers ---
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKey(workspaceId),
    queryFn: () => fetchWorkspaceData(workspaceId),
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

export function useUserSessions(sessionId: string) {
  return useQuery({
    queryKey: userKey(sessionId),
    queryFn: () => db.getUsersBySessionId(sessionId),
    select: (data) => data ?? [],
    enabled: !!sessionId,
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
    mutationFn: (data: NewUserSession | NewUserSession[]) => db.upsertUserSessions(data),
    onSuccess: (result, _input) => {
      // Invalidate all affected session queries so that if we query for a session it will be fetched
      const sessionIds = result.map(v => v.session_id);
      sessionIds.forEach(sessionId => {
        queryClient.invalidateQueries({ queryKey: userKey(sessionId) });
      });
    },
  });
}

export function useUpsertMessages() {
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
      // Optionally, invalidate workspace/session lists if needed
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
    },
  });
}