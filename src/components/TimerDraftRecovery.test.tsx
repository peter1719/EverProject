import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TimerDraftRecovery } from './TimerDraftRecovery';
import { useTimerStore } from '@/store/timerStore';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { TimerDraft } from '@/types';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLoadTimerDraft = vi.fn<[], Promise<TimerDraft | undefined>>();
const mockClearTimerDraft = vi.fn<[], Promise<void>>();

vi.mock('@/db/timerDraft', () => ({
  loadTimerDraft: () => mockLoadTimerDraft(),
  clearTimerDraft: () => mockClearTimerDraft(),
  saveTimerDraft: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const baseDraft: TimerDraft = {
  key: 'timer_draft',
  phase: 'paused',
  projectIds: ['p1'],
  currentProjectIndex: 0,
  plannedDurationMinutes: 30,
  remainingSeconds: 900,
  startedAt: Date.now() - 900_000,
  comboGroupId: null,
  skippedProjectIds: [],
  projectElapsedMs: { p1: 900_000 },
  projectAllocatedMinutes: {},
};

function renderComponent() {
  return render(
    <MemoryRouter>
      <TimerDraftRecovery />
    </MemoryRouter>,
  );
}

// ── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockNavigate.mockClear();
  mockLoadTimerDraft.mockReset();
  mockClearTimerDraft.mockResolvedValue(undefined);
  useTimerStore.setState({
    phase: 'idle',
    projectIds: [],
    currentProjectIndex: 0,
    plannedDurationMinutes: 0,
    remainingSeconds: 0,
    startedAt: null,
    comboGroupId: null,
    skippedProjectIds: [],
    projectElapsedMs: {},
    projectAllocatedMinutes: {},
  });
  useProjectStore.setState({ projects: [{ id: 'p1', name: 'My Project', color: 'indigo', estimatedDurationMinutes: 30, notes: '', isArchived: false, createdAt: 1000, updatedAt: 1000 }], isHydrated: true });
  useSettingsStore.setState({ settings: { lastVisitedTab: '/library', language: 'en' } });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TimerDraftRecovery', () => {
  it('renders nothing when no draft', async () => {
    mockLoadTimerDraft.mockResolvedValue(undefined);
    renderComponent();
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders nothing when timerStore already running', async () => {
    useTimerStore.setState({ phase: 'running' } as never);
    mockLoadTimerDraft.mockResolvedValue(baseDraft);
    renderComponent();
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows dialog when valid draft exists', async () => {
    mockLoadTimerDraft.mockResolvedValue(baseDraft);
    renderComponent();
    await act(async () => {});
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Unfinished session')).toBeTruthy();
  });

  it('shows project name(s) and remaining minutes', async () => {
    mockLoadTimerDraft.mockResolvedValue(baseDraft);
    renderComponent();
    await act(async () => {});
    expect(screen.getByText('My Project')).toBeTruthy();
    // 900s = 15 min
    expect(screen.getByText('15 min remaining')).toBeTruthy();
  });

  it('clicking continue → restoreTimer + navigate to /timer (draft kept for ongoing save)', async () => {
    const user = userEvent.setup();
    mockLoadTimerDraft.mockResolvedValue(baseDraft);
    renderComponent();
    await act(async () => {});
    await user.click(screen.getByText('▶ Resume'));
    // phase is restored from the draft (baseDraft.phase = 'paused')
    expect(useTimerStore.getState().phase).toBe('paused');
    // Draft is NOT cleared on continue — it stays alive until timer finishes/resets
    expect(mockClearTimerDraft).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/timer', expect.objectContaining({ state: expect.any(Object) }));
  });

  it('clicking discard → clears draft + dialog gone', async () => {
    const user = userEvent.setup();
    mockLoadTimerDraft.mockResolvedValue(baseDraft);
    renderComponent();
    await act(async () => {});
    await user.click(screen.getByText('Discard'));
    expect(mockClearTimerDraft).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
