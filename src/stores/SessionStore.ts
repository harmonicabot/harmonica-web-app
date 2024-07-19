import { create } from 'zustand'
import { SessionData } from '../app/home/page'

interface SessionStore {
  sessions: Record<string, SessionData[]>
  setSessions: (id: string, data: SessionData[]) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: {},
  setSessions: (id, data) => set((state) => ({ 
    sessions: { ...state.sessions, [id]: data } 
  })),
}))