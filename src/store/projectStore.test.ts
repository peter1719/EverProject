import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project, Session } from '@/types';

// ── IDB mock ────────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  getAll: vi.fn<[], Promise<Project[]>>(),
  put: vi.fn<[string, unknown], Promise<void>>(),
  delete: vi.fn<[string, string], Promise<void>>(),
}));

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve(mockDb),
}));

import { useProjectStore } from './projectStore';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeSession(projectId: string, startedAt: number): Session {
  return {
    id: `session-${projectId}-${startedAt}`,
    projectId,
    projectName: projectId,
    projectColor: 'indigo',
    startedAt,
    endedAt: startedAt + 30 * 60_000,
    plannedDurationMinutes: 30,
    actualDurationMinutes: 30,
    outcome: 'completed',
    notes: '',
    wasCombo: false,
    comboGroupId: null,
  };
}

beforeEach(() => {
  useProjectStore.setState({ projects: [], isHydrated: false });
  mockDb.getAll.mockResolvedValue([]);
  mockDb.put.mockResolvedValue(undefined);
  mockDb.delete.mockResolvedValue(undefined);
});

// ── hydrate ──────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('loads projects from IDB and sets isHydrated', async () => {
    const p = makeProject({ id: 'p1' });
    mockDb.getAll.mockResolvedValue([p]);
    await useProjectStore.getState().hydrate();
    expect(useProjectStore.getState().projects).toEqual([p]);
    expect(useProjectStore.getState().isHydrated).toBe(true);
  });

  it('sets empty array and isHydrated when DB is empty', async () => {
    await useProjectStore.getState().hydrate();
    expect(useProjectStore.getState().projects).toEqual([]);
    expect(useProjectStore.getState().isHydrated).toBe(true);
  });
});

// ── addProject ───────────────────────────────────────────────────────────────

describe('addProject', () => {
  it('appends project to store and calls db.put', async () => {
    await useProjectStore.getState().addProject({
      name: 'Reading',
      color: 'green',
      estimatedDurationMinutes: 30,
      notes: '',
      isArchived: false,
    });
    const projects = useProjectStore.getState().projects;
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Reading');
    expect(mockDb.put).toHaveBeenCalledOnce();
  });

  it('assigns an id, createdAt, and updatedAt', async () => {
    await useProjectStore.getState().addProject({
      name: 'Test',
      color: 'indigo',
      estimatedDurationMinutes: 45,
      notes: '',
      isArchived: false,
    });
    const p = useProjectStore.getState().projects[0];
    expect(p.id).toBeTruthy();
    expect(p.createdAt).toBeTypeOf('number');
    expect(p.updatedAt).toBeTypeOf('number');
  });
});

// ── updateProject ────────────────────────────────────────────────────────────

describe('updateProject', () => {
  it('updates the name and calls db.put', async () => {
    const p = makeProject({ id: 'p1', name: 'Old' });
    useProjectStore.setState({ projects: [p], isHydrated: true });

    await useProjectStore.getState().updateProject('p1', { name: 'New' });

    expect(useProjectStore.getState().projects[0].name).toBe('New');
    expect(mockDb.put).toHaveBeenCalledOnce();
  });

  it('is a no-op for unknown id', async () => {
    const p = makeProject({ id: 'p1' });
    useProjectStore.setState({ projects: [p], isHydrated: true });
    await useProjectStore.getState().updateProject('unknown', { name: 'X' });
    expect(useProjectStore.getState().projects[0].name).toBe('p1');
  });
});

// ── archiveProject / unarchiveProject ───────────────────────────────────────

describe('archiveProject / unarchiveProject', () => {
  it('sets isArchived to true', async () => {
    const p = makeProject({ id: 'p1', isArchived: false });
    useProjectStore.setState({ projects: [p], isHydrated: true });
    await useProjectStore.getState().archiveProject('p1');
    expect(useProjectStore.getState().projects[0].isArchived).toBe(true);
  });

  it('sets isArchived back to false', async () => {
    const p = makeProject({ id: 'p1', isArchived: true });
    useProjectStore.setState({ projects: [p], isHydrated: true });
    await useProjectStore.getState().unarchiveProject('p1');
    expect(useProjectStore.getState().projects[0].isArchived).toBe(false);
  });
});

// ── deleteProject ────────────────────────────────────────────────────────────

describe('deleteProject', () => {
  it('removes the project from store and calls db.delete', async () => {
    const p = makeProject({ id: 'p1' });
    useProjectStore.setState({ projects: [p], isHydrated: true });
    await useProjectStore.getState().deleteProject('p1');
    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(mockDb.delete).toHaveBeenCalledOnce();
  });
});

// ── getActiveProjects ────────────────────────────────────────────────────────

describe('getActiveProjects', () => {
  it('excludes archived projects', () => {
    const active = makeProject({ id: 'a', isArchived: false });
    const archived = makeProject({ id: 'b', isArchived: true });
    useProjectStore.setState({ projects: [active, archived], isHydrated: true });
    const result = useProjectStore.getState().getActiveProjects([]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('sorts by most recent session first', () => {
    const now = Date.now();
    const pA = makeProject({ id: 'a', createdAt: now - 2000 });
    const pB = makeProject({ id: 'b', createdAt: now - 1000 });
    useProjectStore.setState({ projects: [pA, pB], isHydrated: true });

    const sessions = [
      makeSession('a', now - 1000), // A was done 1 s ago
      makeSession('b', now - 5000), // B was done 5 s ago
    ];

    const result = useProjectStore.getState().getActiveProjects(sessions);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('falls back to createdAt for projects with no sessions', () => {
    const now = Date.now();
    const pA = makeProject({ id: 'a', createdAt: now - 2000 });
    const pB = makeProject({ id: 'b', createdAt: now - 1000 });
    useProjectStore.setState({ projects: [pA, pB], isHydrated: true });

    const result = useProjectStore.getState().getActiveProjects([]);
    // newer createdAt (pB) should come first
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });
});

// ── getProjectById ────────────────────────────────────────────────────────────

describe('getProjectById', () => {
  it('returns the project for a known id', () => {
    const p = makeProject({ id: 'p1' });
    useProjectStore.setState({ projects: [p], isHydrated: true });
    expect(useProjectStore.getState().getProjectById('p1')).toEqual(p);
  });

  it('returns undefined for an unknown id', () => {
    useProjectStore.setState({ projects: [], isHydrated: true });
    expect(useProjectStore.getState().getProjectById('missing')).toBeUndefined();
  });
});
