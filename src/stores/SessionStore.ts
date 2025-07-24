import { create } from 'zustand'
import { HostSession, Message, UserSession } from '@/lib/schema';

interface SessionStore {
  workspaceData: Record<string, string[]> // workspaceId to session IDs
  addWorkspaceData: (workspaceId: string, hostSessionIds: string[]) => void
  hostData: Record<string, HostSession>
  addHostData: (id: string, data: HostSession) => void
  userData: Record<string, UserSession[]>
  addUserData: (id: string, data: UserSession[]) => void
  updateUserData: (sessionId: string, userId: string, updates: Partial<UserSession>) => void
  messageData: Record<string, Message[]>
  addMessageData: (id: string, data: Message[]) => void
  removeSession: (id: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  workspaceData: {},
  addWorkspaceData: (workspaceId, hostSessionIds) => set((state) => ({
    workspaceData: { ...state.workspaceData, [workspaceId]: hostSessionIds }
  })),
  hostData: {},
  addHostData: (sessionId, data) => set((state) => ({
    hostData: { ...state.hostData, [sessionId]: data }
  })),
  userData: {},
  addUserData: (sessionId, data) => set((state) => ({
    userData: { ...state.userData, [sessionId]: data }
  })),
  updateUserData: (sessionId, userId, updates) => set((state) => ({
    userData: {
      ...state.userData,
      [sessionId]: state.userData[sessionId]?.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      ) || []
    }
  })),
  messageData: {},
  addMessageData: (threadId, data) => set((state) => ({
    messageData: { ...state.messageData, [threadId]: data }
  })),
  removeSession: (sessionId) => set((state) => {
    const { [sessionId]: removedHostData, ...remainingHostData } = state.hostData;
    const { [sessionId]: removedUserData, ...remainingUserData } = state.userData;
    return { hostData: remainingHostData, userData: remainingUserData };
  })
}))