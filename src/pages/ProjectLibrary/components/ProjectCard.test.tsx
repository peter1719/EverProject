import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from './ProjectCard';
import { useSessionStore } from '@/store/sessionStore';
import type { Project } from '@/types';

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve({ getAll: vi.fn().mockResolvedValue([]), put: vi.fn().mockResolvedValue(undefined) }),
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
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('renders a duration badge with ~ prefix (lowercase)', () => {
    setup({ estimatedDurationMinutes: 45 });
    expect(screen.getByText('~45m')).toBeInTheDocument();
  });

  it('renders a play button ▶', () => {
    setup();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('renders a menu button with aria-label "More options"', () => {
    setup();
    expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument();
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
    const nameEl = screen.getByText('Archived One');
    expect(nameEl.className).toContain('text-on-surface-variant');
  });

  it('card wrapper does not have overflow-hidden (menu popup must not be clipped)', () => {
    const { container } = setup();
    // overflow-hidden on the card would clip the absolutely-positioned dropdown menu
    const cardWrapper = container.querySelector('.bg-surface-variant');
    expect(cardWrapper).not.toBeNull();
    expect(cardWrapper!.className).not.toContain('overflow-hidden');
  });
});

// ── menu ──────────────────────────────────────────────────────────────────────

describe('ProjectCard menu', () => {
  it('menu is hidden initially', () => {
    setup();
    expect(screen.queryByText('✎ Edit')).not.toBeInTheDocument();
  });

  it('opens when ··· button is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByText('✎ Edit')).toBeInTheDocument();
  });

  it('shows Archive for active projects', async () => {
    const user = userEvent.setup();
    setup({ isArchived: false });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByText(/Archive/i)).toBeInTheDocument();
    expect(screen.queryByText(/Unarchive/i)).not.toBeInTheDocument();
  });

  it('shows Unarchive for archived projects', async () => {
    const user = userEvent.setup();
    setup({ isArchived: true });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByText(/Unarchive/i)).toBeInTheDocument();
    expect(screen.queryByText(/⊳ Archive/i)).not.toBeInTheDocument();
  });

  it('closes when the backdrop overlay is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'More options' }));
    const overlay = document.querySelector('div.fixed.inset-0') as HTMLElement;
    await user.click(overlay);
    expect(screen.queryByText('✎ Edit')).not.toBeInTheDocument();
  });
});

// ── menu actions ──────────────────────────────────────────────────────────────

describe('ProjectCard menu actions', () => {
  it('Edit action closes menu and calls onEdit with project', async () => {
    const user = userEvent.setup();
    const { onEdit, project } = setup();
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText('✎ Edit'));
    expect(onEdit).toHaveBeenCalledWith(project);
    expect(screen.queryByText('✎ Edit')).not.toBeInTheDocument();
  });

  it('Archive action closes menu and calls onArchive with project id', async () => {
    const user = userEvent.setup();
    const { onArchive } = setup({ isArchived: false });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText(/⊳ Archive/i));
    expect(onArchive).toHaveBeenCalledWith('project-1');
    expect(screen.queryByText('✎ Edit')).not.toBeInTheDocument();
  });

  it('Unarchive action calls onUnarchive with project id', async () => {
    const user = userEvent.setup();
    const { onUnarchive } = setup({ isArchived: true });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText(/Unarchive/i));
    expect(onUnarchive).toHaveBeenCalledWith('project-1');
  });

  it('Delete action opens the delete dialog (does NOT call onDelete immediately)', async () => {
    const user = userEvent.setup();
    const { onDelete } = setup({ name: 'My Project' });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText('✕ Delete'));
    expect(onDelete).not.toHaveBeenCalled();
    // Dialog visible — message includes project name
    expect(screen.getByText(/Delete "My Project"/)).toBeInTheDocument();
  });
});

// ── card tap ─────────────────────────────────────────────────────────────────

describe('ProjectCard tap to start', () => {
  it('calls onStart with the project when card body is clicked', async () => {
    const user = userEvent.setup();
    const { onStart, project } = setup();
    const cardBody = screen.getByText('My Project').closest('button')!;
    await user.click(cardBody);
    expect(onStart).toHaveBeenCalledWith(project);
  });
});

// ── delete dialog ─────────────────────────────────────────────────────────────

describe('ProjectCard delete dialog', () => {
  beforeEach(async () => {
    // Shared setup: open menu, click Delete
  });

  it('confirms deletion — calls onDelete and closes dialog', async () => {
    const user = userEvent.setup();
    const { onDelete } = setup({ name: 'Test' });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText('✕ Delete'));
    await user.click(screen.getByRole('button', { name: 'YES' }));
    expect(onDelete).toHaveBeenCalledWith('project-1');
  });

  it('cancels deletion — does NOT call onDelete', async () => {
    const user = userEvent.setup();
    const { onDelete } = setup({ name: 'Test' });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText('✕ Delete'));
    await user.click(screen.getByRole('button', { name: 'NO' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('dialog message includes project name', async () => {
    const user = userEvent.setup();
    setup({ name: 'Reading' });
    await user.click(screen.getByRole('button', { name: 'More options' }));
    await user.click(screen.getByText('✕ Delete'));
    expect(screen.getByText(/Delete "Reading"/)).toBeInTheDocument();
  });
});
