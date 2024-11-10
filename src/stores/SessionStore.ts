import { create } from 'zustand'
import { UserSessionData, HostAndUserData, AllSessionsData } from '@/lib/types'

interface SessionStore {
  sessions: Record<string, UserSessionData[]>
  addUserSessionData: (id: string, data: UserSessionData[]) => void
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