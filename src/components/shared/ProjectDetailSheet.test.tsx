import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectDetailSheet } from './ProjectDetailSheet';
import { useSessionStore } from '@/store/sessionStore';
import type { Project, Session } from '@/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useSessionImage', () => ({
  useSessionImage: vi.fn().mockReturnValue(null),
}));

vi.mock('@/db', () => ({
  getDB: () =>
    Promise.resolve({
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      getAllFromIndex: vi.fn().mockResolvedValue([]),
    }),
}));

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    projectDurationMinutes: 0,
    notes: '',
    isArchived: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<Session> & { id: string; projectId: string },
): Session {
  return {
    projectName: overrides.projectId,
    projectColor: 'indigo',
    startedAt: Date.now(),
    endedAt: Date.now() + 30 * 60_000,
    plannedDurationMinutes: 30,
    actualDurationMinutes: 30,
    outcome: 'completed',
    notes: '',
    wasCombo: false,
    comboGroupId: null,
    ...overrides,
  };
}

function renderSheet(project: Project | null) {
  return render(
    <ProjectDetailSheet project={project} onClose={vi.fn()} />,
  );
}

async function renderSheetOnNotesTab(project: Project | null) {
  const user = userEvent.setup();
  const result = renderSheet(project);
  if (project) {
    await user.click(screen.getByRole('button', { name: 'Notes' }));
  }
  return result;
}

// ── Tests ────────────────────────────────────────────────────────────────────

const project = makeProject({ id: 'p1', name: 'My Project' });

beforeEach(() => {
  useSessionStore.setState({ sessions: [], isHydrated: true, imageVersions: {} });
});

describe('ProjectDetailSheet — session note visibility', () => {
  it('shows a session with non-empty notes', async () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [makeSession({ id: 's1', projectId: 'p1', notes: 'great run', startedAt: now })],
      isHydrated: true,
      imageVersions: {},
    });
    await renderSheetOnNotesTab(project);
    expect(screen.getByText('great run')).toBeInTheDocument();
  });

  it('shows a session with empty notes (date/duration always visible)', async () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [makeSession({ id: 's1', projectId: 'p1', notes: '', startedAt: now })],
      isHydrated: true,
      imageVersions: {},
    });
    await renderSheetOnNotesTab(project);
    expect(screen.queryByText(/no sessions yet/i)).not.toBeInTheDocument();
    // Badge "1" should be visible
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows a session whose notes are only whitespace', async () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [makeSession({ id: 's1', projectId: 'p1', notes: '   ', startedAt: now })],
      isHydrated: true,
      imageVersions: {},
    });
    await renderSheetOnNotesTab(project);
    expect(screen.queryByText(/no sessions yet/i)).not.toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows a session that has an image even when notes are empty', () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [makeSession({ id: 's1', projectId: 'p1', notes: '', hasImage: true, startedAt: now })],
      isHydrated: true,
      imageVersions: {},
    });
    renderSheet(project);
    expect(screen.queryByText(/no sessions yet/i)).not.toBeInTheDocument();
  });

  it('shows ALL sessions regardless of whether they have notes', async () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', notes: 'first note', startedAt: now - 3000 }),
        makeSession({ id: 's2', projectId: 'p1', notes: '', startedAt: now - 2000 }), // no notes — still shown
        makeSession({ id: 's3', projectId: 'p1', notes: 'third note', startedAt: now - 1000 }),
      ],
      isHydrated: true,
      imageVersions: {},
    });
    await renderSheetOnNotesTab(project);
    expect(screen.getByText('first note')).toBeInTheDocument();
    expect(screen.getByText('third note')).toBeInTheDocument();
    // All 3 badges are rendered
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show sessions from a different project', () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'OTHER', notes: 'other project note', startedAt: now }),
      ],
      isHydrated: true,
      imageVersions: {},
    });
    renderSheet(project);
    expect(screen.queryByText('other project note')).not.toBeInTheDocument();
  });

  it('badge numbers reflect chronological order across ALL project sessions', async () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', notes: 'first note', startedAt: now - 3000 }),
        makeSession({ id: 's2', projectId: 'p1', notes: '', startedAt: now - 2000 }),
        makeSession({ id: 's3', projectId: 'p1', notes: 'third note', startedAt: now - 1000 }),
      ],
      isHydrated: true,
      imageVersions: {},
    });
    await renderSheetOnNotesTab(project);
    // All 3 sessions shown with correct badge numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  /**
   * Regression test: `notes` may be undefined at runtime for sessions stored
   * in IndexedDB before the `notes` field was introduced, or due to data
   * corruption.  Previously `s.notes.trim()` would throw TypeError, causing
   * the entire filter to fail and preventing ALL notes from rendering.
   */
  it('does not crash when a session has undefined notes (legacy IDB data)', async () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        // Legacy session — notes missing at runtime despite the TS type saying string
        makeSession({ id: 's1', projectId: 'p1', notes: undefined as unknown as string, startedAt: now - 2000 }),
        // Normal session after the legacy one
        makeSession({ id: 's2', projectId: 'p1', notes: 'visible note', startedAt: now - 1000 }),
      ],
      isHydrated: true,
      imageVersions: {},
    });
    await renderSheetOnNotesTab(project);
    expect(screen.getByText('visible note')).toBeInTheDocument();
  });

  it('renders nothing when project is null', () => {
    renderSheet(null);
    // No note content rendered
    expect(screen.queryByText(/no notes yet/i)).not.toBeInTheDocument();
  });
});
