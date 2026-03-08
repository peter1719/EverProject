import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DailySuggestion } from './DailySuggestion/index';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () =>
    Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/suggest']}>
      <Routes>
        <Route path="/suggest" element={<DailySuggestion />} />
        <Route path="/timer" element={<div>Timer</div>} />
        <Route path="/combo" element={<div>Combo</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useProjectStore.setState({ projects: [], isHydrated: true });
  useSessionStore.setState({ sessions: [], isHydrated: true });
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/suggest' },
    isHydrated: true,
  } as never);
});

// ── empty state ───────────────────────────────────────────────────────────────

describe('DailySuggestion empty state', () => {
  it('shows EmptyState when no active projects', () => {
    renderPage();
    expect(screen.getByText(/NO PROJECTS/i)).toBeInTheDocument();
  });

  it('still shows a suggestion card when project exceeds selected time', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Long Project', estimatedDurationMinutes: 60 })],
      isHydrated: true,
    });
    renderPage();
    // Default is 45 min, project is 60 — duration no longer gates eligibility
    expect(screen.getByText('Long Project')).toBeInTheDocument();
  });
});

// ── suggestion card ───────────────────────────────────────────────────────────

describe('DailySuggestion suggestion card', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Reading', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
  });

  it('shows project name when suggestion available', () => {
    renderPage();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('shows Never done when project has no sessions', () => {
    renderPage();
    // Component renders "Last: Never done"
    expect(screen.getByText(/Never done/i)).toBeInTheDocument();
  });
});

// ── time selector ─────────────────────────────────────────────────────────────

describe('DailySuggestion time selector', () => {
  it('renders all 8 duration buttons including >180', () => {
    renderPage();
    for (const label of ['15', '30', '45', '60', '90', '120', '180', '>180']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('45 is selected by default', () => {
    renderPage();
    const btn45 = screen.getByRole('button', { name: '45' });
    expect(btn45.className).toContain('bg-primary');
  });

  it('clicking a different time button selects it', async () => {
    const user = userEvent.setup();
    renderPage();
    const btn60 = screen.getByRole('button', { name: '60' });
    await user.click(btn60);
    expect(btn60.className).toContain('bg-primary');
  });
});

// ── ROLL AGAIN ────────────────────────────────────────────────────────────────

describe('DailySuggestion ROLL AGAIN', () => {
  it('ROLL AGAIN is disabled when only 1 project fits', async () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderPage();
    const rollBtn = screen.getByRole('button', { name: /ROLL AGAIN/i });
    expect(rollBtn).toBeDisabled();
  });

  it('ROLL AGAIN is enabled when multiple projects fit', () => {
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', estimatedDurationMinutes: 30 }),
        makeProject({ id: 'p2', estimatedDurationMinutes: 30 }),
      ],
      isHydrated: true,
    });
    renderPage();
    expect(screen.getByRole('button', { name: /ROLL AGAIN/i })).not.toBeDisabled();
  });
});

// ── START TIMER ───────────────────────────────────────────────────────────────

describe('DailySuggestion START TIMER', () => {
  it('navigates to /timer with correct payload', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Reading', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: '30' }));
    await user.click(screen.getByRole('button', { name: /START TIMER/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/timer', {
      state: { projectIds: ['p1'], totalMinutes: 30 },
    });
  });
});

// ── TRY COMBO ────────────────────────────────────────────────────────────────

describe('DailySuggestion TRY COMBO', () => {
  it('navigates to /combo?minutes=N', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: '90' }));
    await user.click(screen.getByRole('button', { name: /TRY COMBO/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/combo?minutes=90');
  });
});
