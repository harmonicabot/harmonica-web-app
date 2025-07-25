import { create } from 'zustand'
import { HostSession, Message, NewWorkspace, UserSession, Workspace } from '@/lib/schema';

interface SessionStore {
  workspaceData: Record<string, Workspace | NewWorkspace>
  workspaceMapping: Record<string, string[]> // workspaceId to session IDs
  upsertWorkspaceData: (workspaceId: string, workspaceData: Workspace | NewWorkspace, hostSessionIds: string[]) => void
  upsertWorkspaces: (workspaceId: string, updates: Partial<Workspace | NewWorkspace>, hostSessionIds: string[]) => void
  hostData: Record<string, HostSession>
  upsertHostData: (id: string, data: HostSession) => void
  userData: Record<string, UserSession[]>
  upsertUserData: (sessionId: string, data: UserSession[]) => void
  messageData: Record<string, Message[]>
  upsertMessageData: (id: string, data: Message[]) => void
  removeSession: (id: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  workspaceData: {},
  workspaceMapping: {},
  upsertWorkspaceData: (workspaceId, workspaceData, hostSessionIds) => set((state) => ({
    workspaceData: { ...state.workspaceData, [workspaceId]: workspaceData },
    workspaceMapping: { ...state.workspaceMapping, [workspaceId]: hostSessionIds }
  })),
  upsertWorkspaces: (workspaceId, updates, hostSessionIds) => set((state) => ({
    workspaceData: {
      ...state.workspaceData,
      [workspaceId]: {
        ...state.workspaceData[workspaceId],
        ...updates
      }
    },
    workspaceMapping: { ...state.workspaceMapping, [workspaceId]: hostSessionIds }
  })),
  hostData: {},
  upsertHostData: (sessionId, data) => set((state) => ({
    hostData: { ...state.hostData, [sessionId]: data }
  })),
  userData: {},
  upsertUserData: (sessionId, data) => set((state) => {
    const existingUsers = state.userData[sessionId] || [];
    // Create a map for quick lookup
    const existingMap = new Map(existingUsers.map(user => [user.id, user]));
    // Merge: update existing, add new
    data.forEach(user => {
      existingMap.set(user.id, { ...existingMap.get(user.id), ...user });
    });
    return {
      userData: {
        ...state.userData,
        [sessionId]: Array.from(existingMap.values()),
      }
    };
  }),
  messageData: {},
  upsertMessageData: (threadId, data) => set((state) => ({
    messageData: { ...state.messageData, [threadId]: data }
  })),
  removeSession: (sessionId) => set((state) => {
    const { [sessionId]: removedHostData, ...remainingHostData } = state.hostData;
    const { [sessionId]: removedUserData, ...remainingUserData } = state.userData;
    return { hostData: remainingHostData, userData: remainingUserData };
  })
}))