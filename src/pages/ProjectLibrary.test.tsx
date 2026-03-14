import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProjectLibrary } from './ProjectLibrary/index';
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
    Promise.resolve({
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
    }),
}));

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    projectDurationMinutes: 0,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function renderLibrary(locationState: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/library', state: locationState }]}>
      <Routes>
        <Route path="/library" element={<ProjectLibrary />} />
        <Route path="/timer" element={<div>Timer</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useProjectStore.setState({ projects: [], isHydrated: true });
  useSessionStore.setState({ sessions: [], isHydrated: true });
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/library' },
    isHydrated: true,
    setLastVisitedTab: vi.fn().mockResolvedValue(undefined),
  } as never);
});

// ── empty state ───────────────────────────────────────────────────────────────

describe('ProjectLibrary empty state', () => {
  it('shows EmptyState when no projects exist', () => {
    renderLibrary();
    expect(screen.getByText(/NO PROJECTS YET/i)).toBeInTheDocument();
  });
});

// ── project cards ─────────────────────────────────────────────────────────────

describe('ProjectLibrary project cards', () => {
  it('renders active project cards', () => {
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', name: 'Alpha' }),
        makeProject({ id: 'p2', name: 'Beta' }),
      ],
      isHydrated: true,
    });
    renderLibrary();
    // Component renders project.name as-is (no uppercase transformation)
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('hides archived projects from the active list', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Active' }), makeProject({ id: 'p2', name: 'Archived', isArchived: true })],
      isHydrated: true,
    });
    renderLibrary();
    expect(screen.getByText('Active')).toBeInTheDocument();
    // 'Archived' project card is hidden (behind the toggle); only the [ARCHIVED] badge
    // and toggle button text might match — use exact text to avoid false positives
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });
});

// ── archived section ──────────────────────────────────────────────────────────

describe('ProjectLibrary archived section', () => {
  it('shows toggle button when archived projects exist', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', isArchived: true, name: 'Old' })],
      isHydrated: true,
    });
    renderLibrary();
    expect(screen.getByText(/Show archived/i)).toBeInTheDocument();
  });

  it('reveals archived cards after clicking the toggle', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', isArchived: true, name: 'Old' })],
      isHydrated: true,
    });
    renderLibrary();
    await user.click(screen.getByText(/Show archived/i));
    // BottomSheet title also renders project name in DOM; use getAllByText
    expect(screen.getAllByText('Old').length).toBeGreaterThan(0);
  });

  it('toggle label updates after expanding', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', isArchived: true })],
      isHydrated: true,
    });
    renderLibrary();
    await user.click(screen.getByText(/Show archived/i));
    expect(screen.getByText(/Hide archived/i)).toBeInTheDocument();
  });
});

// ── add sheet ─────────────────────────────────────────────────────────────────

describe('ProjectLibrary add sheet', () => {
  it('opens on + ADD button click', async () => {
    const user = userEvent.setup();
    renderLibrary();
    await user.click(screen.getByRole('button', { name: 'Add project' }));
    expect(screen.getByText('New project')).toBeInTheDocument();
  });

  it('auto-opens when navigated with openAddSheet state', () => {
    renderLibrary({ openAddSheet: true });
    expect(screen.getByText('New project')).toBeInTheDocument();
  });
});

// ── add project via form ──────────────────────────────────────────────────────

describe('ProjectLibrary adding a project', () => {
  it('adds project to store and closes sheet on save', async () => {
    const user = userEvent.setup();
    renderLibrary();

    // Open add sheet
    await user.click(screen.getByRole('button', { name: 'Add project' }));

    // Fill form
    const nameInput = screen.getByPlaceholderText('My project');
    await user.type(nameInput, 'Reading');

    // Select duration 45
    await user.click(screen.getByRole('button', { name: '45' }));

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Project appears in list (name rendered as-is)
    await vi.waitFor(() => {
      expect(screen.getByText('Reading')).toBeInTheDocument();
    });
  });
});

// ── color filter ──────────────────────────────────────────────────────────────

describe('ProjectLibrary color filter', () => {
  it('filter button renders when projects exist', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Alpha', color: 'indigo' })],
      isHydrated: true,
    });
    renderLibrary();
    expect(screen.getByRole('button', { name: 'Filter by color' })).toBeInTheDocument();
  });

  it('dropdown opens on click and shows All option', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Alpha', color: 'indigo' })],
      isHydrated: true,
    });
    renderLibrary();
    await user.click(screen.getByRole('button', { name: 'Filter by color' }));
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('selecting a color filters projects', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', name: 'Indigo Project', color: 'indigo' }),
        makeProject({ id: 'p2', name: 'Red Project', color: 'red' }),
      ],
      isHydrated: true,
    });
    renderLibrary();
    await user.click(screen.getByRole('button', { name: 'Filter by color' }));
    await user.click(screen.getByRole('button', { name: 'Filter by indigo' }));
    expect(screen.getByText('Indigo Project')).toBeInTheDocument();
    expect(screen.queryByText('Red Project')).not.toBeInTheDocument();
  });

  it('selecting All resets filter', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', name: 'Indigo Project', color: 'indigo' }),
        makeProject({ id: 'p2', name: 'Red Project', color: 'red' }),
      ],
      isHydrated: true,
    });
    renderLibrary();
    await user.click(screen.getByRole('button', { name: 'Filter by color' }));
    await user.click(screen.getByRole('button', { name: 'Filter by indigo' }));
    await user.click(screen.getByRole('button', { name: 'Filter by color' }));
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Indigo Project')).toBeInTheDocument();
    expect(screen.getByText('Red Project')).toBeInTheDocument();
  });

  it('filter applies to archived projects too', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', name: 'Active Indigo', color: 'indigo' }),
        makeProject({ id: 'p2', name: 'Archived Indigo', color: 'indigo', isArchived: true }),
        makeProject({ id: 'p3', name: 'Archived Red', color: 'red', isArchived: true }),
      ],
      isHydrated: true,
    });
    renderLibrary();
    // Select indigo filter
    await user.click(screen.getByRole('button', { name: 'Filter by color' }));
    await user.click(screen.getByRole('button', { name: 'Filter by indigo' }));
    // Expand archived section
    await user.click(screen.getByText(/Show archived/i));
    expect(screen.getByText('Archived Indigo')).toBeInTheDocument();
    expect(screen.queryByText('Archived Red')).not.toBeInTheDocument();
  });
});

// ── scroll to top ─────────────────────────────────────────────────────────────

describe('ProjectLibrary scroll to top', () => {
  it('clicking the header title scrolls the list to the top', async () => {
    const user = userEvent.setup();
    const scrollToMock = vi.fn();
    HTMLElement.prototype.scrollTo = scrollToMock;

    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Alpha' })],
      isHydrated: true,
    });
    renderLibrary();

    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    // cleanup
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTo;
  });
});

// ── start session sheet ───────────────────────────────────────────────────────

describe('ProjectLibrary start session sheet', () => {
  it('opens on project card tap', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Alpha', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderLibrary();

    // Click the play button to open Start Session sheet
    await user.click(screen.getByRole('button', { name: 'Start session' }));

    expect(screen.getByText('Start session?')).toBeInTheDocument();
  });
});
