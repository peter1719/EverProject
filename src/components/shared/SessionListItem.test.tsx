import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionListItem } from './SessionListItem';
import type { Session } from '@/types';

// Mock the IDB-backed image hook so tests don't need a real database
vi.mock('@/hooks/useSessionImage', () => ({
  useSessionImage: vi.fn(),
}));
import { useSessionImage } from '@/hooks/useSessionImage';

const IMAGE_DATA_URL = 'data:image/jpeg;base64,testImageData';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    projectId: 'p1',
    projectName: 'Alpha',
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

beforeEach(() => {
  vi.mocked(useSessionImage).mockReturnValue(null);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

// ── rendering ────────────────────────────────────────────────────────────────

describe('SessionListItem rendering', () => {
  it('renders project name and duration', () => {
    render(
      <SessionListItem
        session={makeSession()}
        projectColor="indigo"
        projectName="Alpha"
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText(/· 30M/)).toBeInTheDocument();
  });

  it('does not render photo area when hasImage is falsy', () => {
    vi.mocked(useSessionImage).mockReturnValue(IMAGE_DATA_URL);
    render(
      <SessionListItem
        session={makeSession({ hasImage: false })}
        projectColor="indigo"
        projectName="Alpha"
      />,
    );
    // No button and no img should be present
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Session photo')).not.toBeInTheDocument();
  });

  it('shows animated skeleton while image is loading (hasImage=true, dataUrl=null)', () => {
    vi.mocked(useSessionImage).mockReturnValue(null);
    const { container } = render(
      <SessionListItem
        session={makeSession({ hasImage: true })}
        projectColor="indigo"
        projectName="Alpha"
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders photo button with img once image data URL is available', () => {
    vi.mocked(useSessionImage).mockReturnValue(IMAGE_DATA_URL);
    render(
      <SessionListItem
        session={makeSession({ hasImage: true })}
        projectColor="indigo"
        projectName="Alpha"
      />,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByAltText('Session photo')).toHaveAttribute('src', IMAGE_DATA_URL);
  });
});

// ── photo button interactions ─────────────────────────────────────────────────

describe('SessionListItem photo button', () => {
  it('clicking the photo button calls onLightbox with the image data URL', async () => {
    const user = userEvent.setup();
    vi.mocked(useSessionImage).mockReturnValue(IMAGE_DATA_URL);
    const onLightbox = vi.fn();

    render(
      <SessionListItem
        session={makeSession({ hasImage: true })}
        projectColor="indigo"
        projectName="Alpha"
        onLightbox={onLightbox}
      />,
    );

    await user.click(screen.getByRole('button'));

    expect(onLightbox).toHaveBeenCalledOnce();
    expect(onLightbox).toHaveBeenCalledWith(IMAGE_DATA_URL);
  });

  it('click on photo button does NOT propagate to parent onClick', async () => {
    const user = userEvent.setup();
    vi.mocked(useSessionImage).mockReturnValue(IMAGE_DATA_URL);
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <SessionListItem
          session={makeSession({ hasImage: true })}
          projectColor="indigo"
          projectName="Alpha"
          onLightbox={vi.fn()}
        />
      </div>,
    );

    await user.click(screen.getByRole('button'));

    expect(parentClick).not.toHaveBeenCalled();
  });

  /**
   * Regression test for the pointer-capture bug.
   *
   * SwipeableSessionCard calls setPointerCapture() inside its onPointerDown
   * handler. On mobile browsers, pointer capture redirects subsequent events
   * (including the synthetic `click`) to the capturing element (the card div),
   * so e.stopPropagation() on the button's onClick never runs.
   *
   * The fix is to also stop propagation on `pointerdown` so that the card's
   * onPointerDown handler never fires and setPointerCapture is never called.
   */
  it('pointerdown on photo button does NOT propagate to parent (prevents pointer-capture by card)', () => {
    vi.mocked(useSessionImage).mockReturnValue(IMAGE_DATA_URL);
    const parentPointerDown = vi.fn();

    render(
      <div onPointerDown={parentPointerDown}>
        <SessionListItem
          session={makeSession({ hasImage: true })}
          projectColor="indigo"
          projectName="Alpha"
          onLightbox={vi.fn()}
        />
      </div>,
    );

    fireEvent.pointerDown(screen.getByRole('button'));

    expect(parentPointerDown).not.toHaveBeenCalled();
  });
});
