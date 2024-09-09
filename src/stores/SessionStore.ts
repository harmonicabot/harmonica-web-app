import { create } from 'zustand'
import { UserSessionData, AccumulatedSessionData } from '@/lib/types'

interface SessionStore {
  sessions: Record<string, UserSessionData[]>
  setSessions: (id: string, data: UserSessionData[]) => void
  accumulated: Record<string, AccumulatedSessionData>
  addAccumulatedSessions: (id: string, data: AccumulatedSessionData) => void
  removeAccumulatedSessions: (id: string) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: {},
  setSessions: (id, data) => set((state) => ({
    sessions: { ...state.sessions, [id]: data }
  })),
  accumulated: {},
  addAccumulatedSessions: (id, data) => set((state) => ({
    accumulated: { ...state.accumulated, [id]: data }
  })),
  removeAccumulatedSessions: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.accumulated;
    return { accumulated: rest };
  })
}))