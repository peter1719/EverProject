import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHeader(props: Partial<React.ComponentProps<typeof PageHeader>> = {}) {
  return render(
    <MemoryRouter>
      <PageHeader title="MY PAGE" {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
});

// ── title ─────────────────────────────────────────────────────────────────────

describe('PageHeader title', () => {
  it('renders title text in an h1', () => {
    renderHeader({ title: 'PROJECT LIBRARY' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('PROJECT LIBRARY');
  });
});

// ── back button ───────────────────────────────────────────────────────────────

describe('PageHeader back button', () => {
  it('not rendered when showBack is false (default)', () => {
    renderHeader();
    expect(screen.queryByText(/Back/i)).not.toBeInTheDocument();
  });

  it('rendered when showBack is true', () => {
    renderHeader({ showBack: true });
    expect(screen.getByText(/Back/i)).toBeInTheDocument();
  });

  it('navigates to backPath when provided', async () => {
    const user = userEvent.setup();
    renderHeader({ showBack: true, backPath: '/suggest' });
    await user.click(screen.getByText(/Back/i));
    expect(mockNavigate).toHaveBeenCalledWith('/suggest');
  });

  it('calls navigate(-1) when backPath is not provided', async () => {
    const user = userEvent.setup();
    renderHeader({ showBack: true });
    await user.click(screen.getByText(/Back/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

// ── rightSlot ─────────────────────────────────────────────────────────────────

describe('PageHeader rightSlot', () => {
  it('renders rightSlot content', () => {
    renderHeader({ rightSlot: <button>FILTER</button> });
    expect(screen.getByRole('button', { name: 'FILTER' })).toBeInTheDocument();
  });

  it('renders nothing in rightSlot position when not provided', () => {
    renderHeader();
    expect(screen.queryByText('FILTER')).not.toBeInTheDocument();
  });
});

// ── className ─────────────────────────────────────────────────────────────────

describe('PageHeader className', () => {
  it('applies additional className to the header element', () => {
    renderHeader({ className: 'extra-test-class' });
    const header = screen.getByRole('banner');
    expect(header.className).toContain('extra-test-class');
  });
});
