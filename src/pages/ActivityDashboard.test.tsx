import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ActivityDashboard } from './ActivityDashboard/index';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Project, Session } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () =>
    Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

// react-calendar-heatmap is a UI library — stub it to avoid SVG render issues in jsdom
vi.mock('react-calendar-heatmap', () => ({
  default: ({ values }: { values: { date: string; count: number }[] }) => (
    <div data-testid="heatmap">{values.length} cells</div>
  ),
}));

function makeProject(id: string, name = id.toUpperCase()): Project {
  return {
    id,
    name,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
  };
}

function makeSession(
  id: string,
  projectId: string,
  overrides: Partial<Session> = {},
): Session {
  return {
    id,
    projectId,
    projectName: projectId,
    projectColor: 'indigo',
    startedAt: Date.now() - 3600_000,
    endedAt: Date.now() - 1800_000,
    plannedDurationMinutes: 30,
    actualDurationMinutes: 30,
    outcome: 'completed',
    notes: '',
    wasCombo: false,
    comboGroupId: null,
    ...overrides,
  };
}

function renderDashboard(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/dashboard${search}`]}>
      <Routes>
        <Route path="/dashboard" element={<ActivityDashboard />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useProjectStore.setState({ projects: [], isHydrated: true });
  useSessionStore.setState({ sessions: [], isHydrated: true });
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/dashboard' },
    isHydrated: true,
  } as never);
  // jsdom does not implement pointer capture — stub it so SwipeableSessionCard clicks work
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// ── view toggle ───────────────────────────────────────────────────────────────

describe('ActivityDashboard view toggle', () => {
  it('OVERVIEW is selected by default', () => {
    renderDashboard();
    const overviewBtn = screen.getByRole('button', { name: /OVERVIEW/i });
    expect(overviewBtn.className).toContain('bg-primary');
  });

  it('pre-selects HISTORY when URL has ?view=history', () => {
    renderDashboard('?view=history');
    const historyBtn = screen.getByRole('button', { name: /HISTORY/i });
    expect(historyBtn.className).toContain('bg-primary');
  });

  it('switches to HISTORY tab on click', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /HISTORY/i }));
    // History tab content appears
    expect(screen.getByText(/ALL PROJECTS/i)).toBeInTheDocument();
  });
});

// ── overview tab ──────────────────────────────────────────────────────────────

describe('ActivityDashboard overview tab', () => {
  it('renders stats tiles with 0 values when no sessions', () => {
    renderDashboard();
    // Multiple tiles may show '0' (sessions count, streak); check at least one
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct total session count (non-abandoned)', () => {
    useSessionStore.setState({
      sessions: [
        makeSession('s1', 'p1', { outcome: 'completed', actualDurationMinutes: 30 }),
        makeSession('s2', 'p1', { outcome: 'abandoned', actualDurationMinutes: 20 }),
      ],
      isHydrated: true,
    });
    renderDashboard();
    // '1' non-abandoned session; multiple tiles may show '1', so check presence
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders heatmap component', () => {
    renderDashboard();
    expect(screen.getByTestId('heatmap')).toBeInTheDocument();
  });

  it('renders Today button', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
  });
});

// ── history tab ───────────────────────────────────────────────────────────────

describe('ActivityDashboard history tab', () => {
  beforeEach(async () => {
    useProjectStore.setState({
      projects: [makeProject('p1', 'Alpha'), makeProject('p2', 'Beta')],
      isHydrated: true,
    });
    useSessionStore.setState({
      sessions: [
        makeSession('s1', 'p1', { outcome: 'completed', startedAt: Date.now() - 1000 }),
        makeSession('s2', 'p2', { outcome: 'partial', startedAt: Date.now() - 2000 }),
      ],
      isHydrated: true,
    });
  });

  it('renders ALL PROJECTS option in filter', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /HISTORY/i }));
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    await user.click(combobox);
    expect(screen.getByRole('option', { name: /All projects/i })).toBeInTheDocument();
  });

  it('shows session cards', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /HISTORY/i }));
    // Should show at least one session card
    await vi.waitFor(() => {
      expect(screen.getAllByText(/30M/).length).toBeGreaterThan(0);
    });
  });

  it('filters sessions by selected project', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /HISTORY/i }));

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: 'Alpha' }));

    // After filtering to p1 (Alpha), only s1 (30M) is shown; s2 is hidden.
    await vi.waitFor(() => {
      // Only 1 session card's "30M" text should be visible
      expect(screen.getAllByText(/30M/).length).toBe(1);
    });
  });
});

// ── edit session sheet ────────────────────────────────────────────────────────

describe('ActivityDashboard edit session sheet', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [makeProject('p1', 'Alpha')],
      isHydrated: true,
    });
    useSessionStore.setState({
      sessions: [makeSession('s1', 'p1', { outcome: 'completed', notes: 'great' })],
      isHydrated: true,
    });
  });

  it('edit sheet opens on session card click', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /HISTORY/i }));

    // Find and click the session card
    await vi.waitFor(() =>
      expect(screen.getAllByRole('button').length).toBeGreaterThan(1),
    );

    // Click the session card (contains "30M" duration)
    const sessionCards = screen.getAllByRole('button');
    const sessionCard = sessionCards.find(btn => btn.textContent?.includes('30M'));
    if (sessionCard) {
      await user.click(sessionCard);
      await vi.waitFor(() => {
        expect(screen.getByText(/EDIT SESSION/i)).toBeInTheDocument();
      });
    }
  });
});

// ── combo session expand/collapse ─────────────────────────────────────────────

describe('ActivityDashboard combo session expand', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [makeProject('p1', 'Alpha'), makeProject('p2', 'Beta')],
      isHydrated: true,
    });
    useSessionStore.setState({
      sessions: [
        makeSession('s1', 'p1', {
          wasCombo: true,
          comboGroupId: 'combo-1',
          actualDurationMinutes: 25,
          startedAt: Date.now() - 2000,
        }),
        makeSession('s2', 'p2', {
          wasCombo: true,
          comboGroupId: 'combo-1',
          actualDurationMinutes: 15,
          startedAt: Date.now() - 1000,
        }),
      ],
      isHydrated: true,
    });
  });

  async function goToHistory(user: ReturnType<typeof userEvent.setup>) {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /HISTORY/i }));
    await vi.waitFor(() =>
      expect(screen.getByText('Combo session')).toBeInTheDocument(),
    );
  }

  it('shows a collapsed combo card initially', async () => {
    const user = userEvent.setup();
    await goToHistory(user);
    expect(screen.getByText('Combo session')).toBeInTheDocument();
    // Individual project names should not be shown as separate cards yet
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
  });

  it('clicking the combo card expands it into individual session cards', async () => {
    const user = userEvent.setup();
    await goToHistory(user);

    await user.click(screen.getByText('Combo session'));

    await vi.waitFor(() => {
      expect(screen.getByText('▲')).toBeInTheDocument();
      // Individual project names now visible as separate cards
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  it('clicking the expanded header collapses it back', async () => {
    const user = userEvent.setup();
    await goToHistory(user);

    // Expand
    await user.click(screen.getByText('Combo session'));
    await vi.waitFor(() => expect(screen.getByText('▲')).toBeInTheDocument());

    // Collapse by clicking the header row
    const header = screen.getByText('▲').closest('div') as HTMLElement;
    await user.click(header);

    await vi.waitFor(() => {
      expect(screen.queryByText('▲')).not.toBeInTheDocument();
    });
  });

  it('clicking an individual card in an expanded combo opens the edit sheet for that session', async () => {
    const user = userEvent.setup();
    await goToHistory(user);

    // Expand the combo
    await user.click(screen.getByText('Combo session'));
    await vi.waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());

    // Click the Alpha card
    await user.click(screen.getByText('Alpha'));

    await vi.waitFor(() => {
      expect(screen.getByText(/Edit session/i)).toBeInTheDocument();
    });
  });
});

// ── heatmap infinite scroll ───────────────────────────────────────────────────

describe('ActivityDashboard heatmap infinite scroll', () => {
  // Helper: count rendered heatmap cells (non-null days get a heatmap-* class)
  function cellCount(): number {
    return document.querySelectorAll('[class*="heatmap-"]').length;
  }

  it('starts with ~365 days of cells', () => {
    renderDashboard();
    // getDailyActivity(365) produces exactly 365 date entries; each non-null day
    // in the grid gets a heatmap-* class. The count should be close to 365.
    const count = cellCount();
    expect(count).toBeGreaterThanOrEqual(363); // allow ±2 for boundary rounding
    expect(count).toBeLessThanOrEqual(367);
  });

  it('loads another year when the scroll container fires a scroll event near the left edge', async () => {
    renderDashboard();
    const before = cellCount();

    // In jsdom scrollLeft is 0 (no layout), which is within the 8-week trigger
    // threshold. Firing a scroll event is enough to trigger load-more.
    const scrollEl = screen.getByTestId('heatmap-scroll');
    fireEvent.scroll(scrollEl);

    await vi.waitFor(() => {
      expect(cellCount()).toBeGreaterThan(before);
    });

    // A second year should have been appended (~730 total)
    expect(cellCount()).toBeGreaterThanOrEqual(before + 363);
  });

  it('does not load beyond the 5-year cap', async () => {
    renderDashboard();

    const scrollEl = screen.getByTestId('heatmap-scroll');

    // Each load adds 365 days: 365 → 730 → 1095 → 1460 → 1825 (cap).
    // After each batch the position-compensation effect increases scrollLeft,
    // so we reset it to 0 before each event to simulate the user scrolling
    // back to the left edge.
    for (let i = 0; i < 4; i++) {
      Object.defineProperty(scrollEl, 'scrollLeft', { value: 0, configurable: true, writable: true });
      fireEvent.scroll(scrollEl);
      await vi.waitFor(() => {
        expect(cellCount()).toBeGreaterThanOrEqual((i + 2) * 363);
      });
    }

    const atCap = cellCount();
    expect(atCap).toBeGreaterThanOrEqual(1815); // ~1825 days

    // At the cap, the scroll listener is removed — extra scroll does nothing
    Object.defineProperty(scrollEl, 'scrollLeft', { value: 0, configurable: true, writable: true });
    fireEvent.scroll(scrollEl);
    await new Promise(r => setTimeout(r, 50));
    expect(cellCount()).toBe(atCap);
  });
});
