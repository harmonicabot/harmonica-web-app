import { create } from 'zustand'
import { HostSession, Message, UserSession } from '@/lib/schema_updated';

interface SessionStore {
  hostData: Record<string, HostSession>
  addHostData: (id: string, data: HostSession) => void
  userData: Record<string, UserSession[]>
  addUserData: (id: string, data: UserSession[]) => void
  messageData: Record<string, Message[]>
  addMessageData: (id: string, data: Message[]) => void
  removeSession: (id: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  hostData: {},
  addHostData: (sessionId, data) => set((state) => ({
    hostData: { ...state.hostData, [sessionId]: data }
  })),
  userData: {},
  addUserData: (sessionId, data) => set((state) => ({
    userData: { ...state.userData, [sessionId]: data }
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