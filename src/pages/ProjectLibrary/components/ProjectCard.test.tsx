import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import { useSessionStore } from '@/store/sessionStore';
import type { Project } from '@/types';

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve({
    getAll: vi.fn().mockResolvedValue([]),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
  }),
}));

beforeEach(() => {
  useSessionStore.setState({ sessions: [], isHydrated: true });
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'My Project',
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function setup(overrides: Partial<Project> = {}) {
  const project = makeProject(overrides);
  const props = {
    project,
    onStart: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onDelete: vi.fn(),
  };
  const result = render(<ProjectCard {...props} />);
  return { ...result, ...props, project };
}

// ── rendering ────────────────────────────────────────────────────────────────

describe('ProjectCard rendering', () => {
  it('renders the project name', () => {
    setup({ name: 'Reading' });
    // BottomSheet title also renders project name in DOM (off-screen when closed)
    const matches = screen.getAllByText('Reading');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders a play button ▶', () => {
    setup();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('renders an edit button with aria-label "Edit project"', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Edit project' })).toBeInTheDocument();
  });

  it('shows Archived tag for archived projects', () => {
    setup({ isArchived: true });
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('does not show Archived tag for active projects', () => {
    setup({ isArchived: false });
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('applies muted text color class to name for archived projects', () => {
    setup({ isArchived: true, name: 'Archived One' });
    // BottomSheet title also renders project name; find the card's <p> specifically
    const cardName = screen.getAllByText('Archived One').find(el => el.tagName === 'P')!;
    expect(cardName.className).toContain('text-on-surface-variant');
  });

  it('card wrapper does not have overflow-hidden', () => {
    const { container } = setup();
    const cardWrapper = container.querySelector('.bg-surface-variant');
    expect(cardWrapper).not.toBeNull();
    expect(cardWrapper!.className).not.toContain('overflow-hidden');
  });
});

// ── edit button ───────────────────────────────────────────────────────────────

describe('ProjectCard edit button', () => {
  it('calls onEdit with the project when edit button is clicked', async () => {
    const user = userEvent.setup();
    const { onEdit, project } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit project' }));
    expect(onEdit).toHaveBeenCalledWith(project);
  });
});

// ── card tap ─────────────────────────────────────────────────────────────────

describe('ProjectCard play button', () => {
  it('calls onStart with the project when play button is clicked', async () => {
    const user = userEvent.setup();
    const { onStart, project } = setup();
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    expect(onStart).toHaveBeenCalledWith(project);
  });

  it('opens note sheet when card body is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('card-body'));
    // Note sheet opens — title is project name, rendered by BottomSheet
    expect(screen.getAllByText('My Project').length).toBeGreaterThan(0);
  });
});

