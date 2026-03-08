import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StartSessionSheet } from './StartSessionSheet';
import type { Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Alpha',
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function setup({
  project = makeProject(),
  onClose = vi.fn(),
  onUnarchive = vi.fn(),
}: {
  project?: Project | null;
  onClose?: () => void;
  onUnarchive?: (id: string) => void;
} = {}) {
  const result = render(
    <MemoryRouter>
      <StartSessionSheet project={project} onClose={onClose} onUnarchive={onUnarchive} />
    </MemoryRouter>,
  );
  return { ...result, onClose, onUnarchive };
}

// ── visibility ───────────────────────────────────────────────────────────────

describe('StartSessionSheet visibility', () => {
  it('renders no content when project is null', () => {
    setup({ project: null });
    // No project name, no START button
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('▶ Start')).not.toBeInTheDocument();
  });

  it('shows project name and START button when project is provided', () => {
    setup();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('▶ Start')).toBeInTheDocument();
  });
});

// ── duration selection ────────────────────────────────────────────────────────

describe('StartSessionSheet duration selection', () => {
  it('defaults to the project estimatedDurationMinutes', () => {
    setup({ project: makeProject({ estimatedDurationMinutes: 60 }) });
    // The 60 button should be highlighted (indigo bg)
    const btn = screen.getByRole('button', { name: '60' });
    expect(btn.className).toContain('bg-primary');
  });

  it('renders all duration options including >180', () => {
    setup();
    for (const label of ['15', '30', '45', '60', '90', '120', '180', '>180']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('highlights clicked duration and deselects previous', async () => {
    const user = userEvent.setup();
    setup({ project: makeProject({ estimatedDurationMinutes: 60 }) });

    const btn30 = screen.getByRole('button', { name: '30' });
    const btn60 = screen.getByRole('button', { name: '60' });

    await user.click(btn30);
    expect(btn30.className).toContain('bg-primary');
    expect(btn60.className).not.toContain('bg-primary');
  });
});

// ── START button ──────────────────────────────────────────────────────────────

describe('StartSessionSheet START button', () => {
  it('navigates to /timer with correct payload', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    setup({ project: makeProject({ id: 'proj-1', estimatedDurationMinutes: 45 }), onClose });

    await user.click(screen.getByText('▶ Start'));
    expect(mockNavigate).toHaveBeenCalledWith('/timer', {
      state: { projectIds: ['proj-1'], totalMinutes: 45, origin: '/library' },
    });
  });

  it('calls onClose after navigating', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    setup({ onClose });

    await user.click(screen.getByText('▶ Start'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('navigates with the selected duration (not the default)', async () => {
    const user = userEvent.setup();
    setup({ project: makeProject({ estimatedDurationMinutes: 30 }) });

    await user.click(screen.getByRole('button', { name: '90' }));
    await user.click(screen.getByText('▶ Start'));
    expect(mockNavigate).toHaveBeenCalledWith('/timer', {
      state: { projectIds: ['proj-1'], totalMinutes: 90, origin: '/library' },
    });
  });
});

// ── CANCEL button ─────────────────────────────────────────────────────────────

describe('StartSessionSheet CANCEL button', () => {
  it('calls onClose without navigating', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    setup({ onClose });

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ── archived project ──────────────────────────────────────────────────────────

describe('StartSessionSheet archived project', () => {
  it('shows Archived banner with primary-container background', () => {
    setup({ project: makeProject({ isArchived: true }) });
    expect(screen.getByText('Archived')).toBeInTheDocument();
    // Banner has primary-container background class
    const banner = screen.getByText('Archived').parentElement!;
    expect(banner.className).toContain('bg-primary-container');
  });

  it('shows UNARCHIVE button when onUnarchive is provided', () => {
    setup({ project: makeProject({ isArchived: true }), onUnarchive: vi.fn() });
    expect(screen.getByRole('button', { name: 'Unarchive' })).toBeInTheDocument();
  });

  it('calls onUnarchive and onClose when UNARCHIVE clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUnarchive = vi.fn();
    setup({ project: makeProject({ id: 'proj-1', isArchived: true }), onClose, onUnarchive });

    await user.click(screen.getByRole('button', { name: 'Unarchive' }));
    expect(onUnarchive).toHaveBeenCalledWith('proj-1');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not show UNARCHIVE when onUnarchive prop is absent', () => {
    render(
      <MemoryRouter>
        <StartSessionSheet
          project={makeProject({ isArchived: true })}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Unarchive' })).not.toBeInTheDocument();
  });

  it('shows no archived banner for active projects', () => {
    setup({ project: makeProject({ isArchived: false }) });
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });
});
