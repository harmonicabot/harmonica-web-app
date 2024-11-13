import { create } from 'zustand'
import { HostAndUserData, AllSessionsData } from '@/lib/types'
import { UserSession } from '@/lib/schema';

interface SessionStore {
  sessions: Record<string, UserSession[]>
  addUserSessionData: (id: string, data: UserSession[]) => void
  allSessionData: AllSessionsData
  addSession: (id: string, data: HostAndUserData) => void
  removeSession: (id: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: {},
  addUserSessionData: (id, data) => set((state) => ({
    sessions: { ...state.sessions, [id]: data }
  })),
  allSessionData: {},
  addSession: (id, data) => set((state) => ({
    allSessionData: { ...state.allSessionData, [id]: data }
  })),
  removeSession: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.allSessionData;
    return { allSessionData: rest };
  })
}))