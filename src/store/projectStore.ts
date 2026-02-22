import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getDB } from '@/db';
import type { Project, Session } from '@/types';

interface ProjectState {
  projects: Project[];
  isHydrated: boolean;
}

interface ProjectActions {
  hydrate(): Promise<void>;
  addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  updateProject(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void>;
  archiveProject(id: string): Promise<void>;
  unarchiveProject(id: string): Promise<void>;
  deleteProject(id: string): Promise<void>;
}

interface ProjectSelectors {
  /** Active projects sorted by most recent session startedAt DESC (fallback: createdAt DESC). */
  getActiveProjects(sessions: Session[]): Project[];
  getProjectById(id: string): Project | undefined;
}

export const useProjectStore = create<ProjectState & ProjectActions & ProjectSelectors>()(
  immer((set, get) => ({
    projects: [],
    isHydrated: false,

    async hydrate() {
      const db = await getDB();
      const projects = await db.getAll('projects');
      set(state => {
        state.projects = projects;
        state.isHydrated = true;
      });
    },

    async addProject(data) {
      const project: Project = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const db = await getDB();
      await db.put('projects', project);
      set(state => {
        state.projects.push(project);
      });
    },

    async updateProject(id, patch) {
      const db = await getDB();
      const existing = get().projects.find(p => p.id === id);
      if (!existing) return;
      const updated: Project = { ...existing, ...patch, updatedAt: Date.now() };
      await db.put('projects', updated);
      set(state => {
        const idx = state.projects.findIndex(p => p.id === id);
        if (idx !== -1) state.projects[idx] = updated;
      });
    },

    async archiveProject(id) {
      await get().updateProject(id, { isArchived: true });
    },

    async unarchiveProject(id) {
      await get().updateProject(id, { isArchived: false });
    },

    async deleteProject(id) {
      const db = await getDB();
      await db.delete('projects', id);
      set(state => {
        state.projects = state.projects.filter(p => p.id !== id);
      });
    },

    getActiveProjects(sessions) {
      const active = get().projects.filter(p => !p.isArchived);

      // Build a map: projectId → most recent session startedAt
      const lastSessionMap = new Map<string, number>();
      for (const s of sessions) {
        const current = lastSessionMap.get(s.projectId) ?? 0;
        if (s.startedAt > current) lastSessionMap.set(s.projectId, s.startedAt);
      }

      return [...active].sort((a, b) => {
        const aLast = lastSessionMap.get(a.id) ?? a.createdAt;
        const bLast = lastSessionMap.get(b.id) ?? b.createdAt;
        return bLast - aLast;
      });
    },

    getProjectById(id) {
      return get().projects.find(p => p.id === id);
    },
  })),
);
