import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SessionComplete } from './SessionComplete/index';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Project, CompleteRouterState } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () =>
    Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

function makeProject(id: string): Project {
  return {
    id,
    name: id.toUpperCase(),
    color: 'indigo',
    estimatedDurationMinutes: 30,
    projectDurationMinutes: 0,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function makeRouterState(overrides: Partial<CompleteRouterState> = {}): CompleteRouterState {
  return {
    actualDurationMs: 30 * 60_000,
    projectIds: ['p1'],
    comboGroupId: null,
    plannedDurationMinutes: 30,
    outcome: 'completed',
    skippedProjectIds: [],
    projectElapsedMs: { p1: 30 * 60_000 },
    ...overrides,
  };
}

function renderComplete(state: CompleteRouterState | null = makeRouterState()) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/complete', state }]}>
      <Routes>
        <Route path="/complete" element={<SessionComplete />} />
        <Route path="/library" element={<div>Library</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useProjectStore.setState({
    projects: [makeProject('p1')],
    isHydrated: true,
  });
  useSessionStore.setState({ sessions: [], isHydrated: true });
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/suggest' },
    isHydrated: true,
  } as never);
});

// ── redirect guards ───────────────────────────────────────────────────────────

describe('SessionComplete redirect guards', () => {
  it('redirects to /library when no router state', () => {
    renderComplete(null);
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('redirects when projectIds is empty', () => {
    renderComplete(makeRouterState({ projectIds: [] }));
    expect(screen.getByText('Library')).toBeInTheDocument();
  });
});

// ── outcome headers ───────────────────────────────────────────────────────────

describe('SessionComplete outcome headers', () => {
  it('shows "✓ Session complete" for completed outcome', () => {
    renderComplete(makeRouterState({ outcome: 'completed' }));
    expect(screen.getByText(/Session complete/i)).toBeInTheDocument();
  });

  it('shows session logged header for partial outcome', () => {
    renderComplete(makeRouterState({ outcome: 'partial' }));
    expect(screen.getByText(/Session logged/i)).toBeInTheDocument();
  });

  it('shows abandoned header for abandoned outcome', () => {
    renderComplete(makeRouterState({ outcome: 'abandoned' }));
    expect(screen.getByText(/Abandoned/i)).toBeInTheDocument();
  });
});

// ── outcome toggle ────────────────────────────────────────────────────────────

describe('SessionComplete outcome toggle', () => {
  it('pre-selects the outcome from router state', () => {
    renderComplete(makeRouterState({ outcome: 'partial' }));
    const partialBtn = screen.getByRole('button', { name: /Partial/i });
    expect(partialBtn).toBeInTheDocument();
  });

  it('allows changing the outcome', async () => {
    const user = userEvent.setup();
    renderComplete(makeRouterState({ outcome: 'partial' }));
    await user.click(screen.getByRole('button', { name: /Done/i }));
    const doneBtn = screen.getByRole('button', { name: /Done/i });
    expect(doneBtn.className).toContain('bg-success');
  });
});

// ── notes field ───────────────────────────────────────────────────────────────

describe('SessionComplete notes field', () => {
  it('renders a notes textarea', () => {
    renderComplete();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('character counter updates as user types', async () => {
    const user = userEvent.setup();
    renderComplete();
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    expect(screen.getByText(/5 \/ 500/)).toBeInTheDocument();
  });
});

// ── save flow ─────────────────────────────────────────────────────────────────

describe('SessionComplete save flow', () => {
  it('Save and Quit buttons are present', () => {
    renderComplete();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quit/i })).toBeInTheDocument();
  });

  it('clicking Save calls addSession and navigates to /dashboard', async () => {
    const user = userEvent.setup();
    const addSession = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState(prev => ({ ...prev, addSession }));

    renderComplete();
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await vi.waitFor(() => {
      expect(addSession).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('clicking Quit opens a confirmation dialog instead of navigating immediately', async () => {
    const user = userEvent.setup();
    renderComplete();
    await user.click(screen.getByRole('button', { name: /Quit/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Quit without saving/i)).toBeInTheDocument();
  });

  it('confirming quit dialog navigates to / without saving', async () => {
    const user = userEvent.setup();
    const addSession = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState(prev => ({ ...prev, addSession }));

    renderComplete();
    await user.click(screen.getByRole('button', { name: /Quit/i }));
    await user.click(screen.getByRole('button', { name: 'YES, QUIT' }));

    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(addSession).not.toHaveBeenCalled();
  });

  it('cancelling quit dialog keeps the user on the page', async () => {
    const user = userEvent.setup();
    renderComplete();
    await user.click(screen.getByRole('button', { name: /Quit/i }));
    await user.click(screen.getByRole('button', { name: /KEEP LOGGING/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

// ── combo session ─────────────────────────────────────────────────────────────

describe('SessionComplete combo session', () => {
  it('calls addSession for each project in a combo', async () => {
    const user = userEvent.setup();
    const addSession = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState(prev => ({ ...prev, addSession }));
    useProjectStore.setState({
      projects: [makeProject('p1'), makeProject('p2')],
      isHydrated: true,
    });

    renderComplete(
      makeRouterState({
        projectIds: ['p1', 'p2'],
        comboGroupId: 'combo-abc',
        projectElapsedMs: { p1: 25 * 60_000, p2: 15 * 60_000 },
        skippedProjectIds: [],
      }),
    );

    await user.click(screen.getByRole('button', { name: /Save/i }));

    await vi.waitFor(() => {
      expect(addSession).toHaveBeenCalledTimes(2);
    });

    const calls = addSession.mock.calls;
    // Both calls share the same comboGroupId
    expect(calls[0][0].comboGroupId).toBe('combo-abc');
    expect(calls[1][0].comboGroupId).toBe('combo-abc');
  });
});
