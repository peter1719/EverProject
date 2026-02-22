import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getDB } from '@/db';
import { toDateString } from '@/lib/utils';
import type { Session, DailyActivity, ProjectTotal } from '@/types';

interface SessionState {
  sessions: Session[];
  isHydrated: boolean;
}

interface SessionActions {
  hydrate(): Promise<void>;
  addSession(data: Omit<Session, 'id'>): Promise<void>;
  updateSession(id: string, patch: Pick<Session, 'outcome' | 'notes'>): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

interface SessionSelectors {
  /** Total non-abandoned sessions. */
  getTotalSessionCount(): number;
  /** Sum of actualDurationMinutes across non-abandoned sessions. */
  getTotalMinutes(): number;
  /** Consecutive days (from today backwards) with at least 1 non-abandoned session. */
  getCurrentStreak(): number;
  /** Daily activity for the last N days, for the heatmap. */
  getDailyActivity(days: number): DailyActivity[];
  /** Per-project totals, sorted by totalMinutes DESC. */
  getProjectTotals(projects: import('@/types').Project[]): ProjectTotal[];
  /** All sessions for a given YYYY-MM-DD date. */
  getSessionsForDay(date: string): Session[];
  /** All sessions DESC by startedAt, optionally filtered by projectId. */
  getSessionsForHistory(filterProjectId?: string): Session[];
  /** Most recent session for a project, or undefined. */
  getLastSessionForProject(projectId: string): Session | undefined;
}

export const useSessionStore = create<SessionState & SessionActions & SessionSelectors>()(
  immer((set, get) => ({
    sessions: [],
    isHydrated: false,

    async hydrate() {
      const db = await getDB();
      const sessions = await db.getAll('sessions');
      set(state => {
        state.sessions = sessions;
        state.isHydrated = true;
      });
    },

    async addSession(data) {
      const session: Session = { id: crypto.randomUUID(), ...data };
      const db = await getDB();
      await db.put('sessions', session);
      set(state => {
        state.sessions.push(session);
      });
    },

    async updateSession(id, patch) {
      const db = await getDB();
      const existing = get().sessions.find(s => s.id === id);
      if (!existing) return;
      const updated: Session = { ...existing, ...patch };
      await db.put('sessions', updated);
      set(state => {
        const idx = state.sessions.findIndex(s => s.id === id);
        if (idx !== -1) state.sessions[idx] = updated;
      });
    },

    async deleteSession(id) {
      const db = await getDB();
      await db.delete('sessions', id);
      set(state => {
        state.sessions = state.sessions.filter(s => s.id !== id);
      });
    },

    getTotalSessionCount() {
      return get().sessions.filter(s => s.outcome !== 'abandoned').length;
    },

    getTotalMinutes() {
      return get()
        .sessions.filter(s => s.outcome !== 'abandoned')
        .reduce((sum, s) => sum + s.actualDurationMinutes, 0);
    },

    getCurrentStreak() {
      const today = toDateString(Date.now());
      const sessionDays = new Set(
        get()
          .sessions.filter(s => s.outcome !== 'abandoned')
          .map(s => toDateString(s.startedAt)),
      );

      let streak = 0;
      const cursor = new Date(today);
      while (sessionDays.has(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    },

    getDailyActivity(days) {
      const result: DailyActivity[] = [];
      const cursor = new Date();

      for (let i = 0; i < days; i++) {
        const date = cursor.toISOString().slice(0, 10);
        const daySessions = get()
          .sessions.filter(s => toDateString(s.startedAt) === date && s.outcome !== 'abandoned');
        result.unshift({ date, count: daySessions.length, sessions: daySessions });
        cursor.setDate(cursor.getDate() - 1);
      }

      return result;
    },

    getProjectTotals(projects) {
      const map = new Map<string, { totalMinutes: number; sessionCount: number }>();
      for (const s of get().sessions) {
        if (s.outcome === 'abandoned') continue;
        const entry = map.get(s.projectId) ?? { totalMinutes: 0, sessionCount: 0 };
        entry.totalMinutes += s.actualDurationMinutes;
        entry.sessionCount += 1;
        map.set(s.projectId, entry);
      }

      return [...map.entries()]
        .map(([projectId, stats]) => ({
          projectId,
          project: projects.find(p => p.id === projectId) ?? {
            id: projectId,
            name: '[DELETED]',
            color: 'slate' as const,
            estimatedDurationMinutes: 0,
            notes: '',
            isArchived: true,
            createdAt: 0,
            updatedAt: 0,
          },
          ...stats,
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);
    },

    getSessionsForDay(date) {
      return get().sessions.filter(s => toDateString(s.startedAt) === date);
    },

    getSessionsForHistory(filterProjectId) {
      const all = [...get().sessions].sort((a, b) => b.startedAt - a.startedAt);
      if (filterProjectId) return all.filter(s => s.projectId === filterProjectId);
      return all;
    },

    getLastSessionForProject(projectId) {
      return get()
        .sessions.filter(s => s.projectId === projectId)
        .sort((a, b) => b.startedAt - a.startedAt)[0];
    },
  })),
);
