import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdatePrompt } from './UpdatePrompt';

vi.mock('@/lib/backup', () => ({
  exportData: vi.fn().mockResolvedValue(undefined),
}));

// Fire the sw-update-available event
function fireUpdateEvent(): void {
  act(() => {
    window.dispatchEvent(new Event('sw-update-available'));
  });
}

beforeEach(() => {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      getRegistration: vi.fn().mockResolvedValue({
        waiting: { postMessage: vi.fn() },
      }),
    },
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Banner visibility ─────────────────────────────────────────────────────────

describe('UpdatePrompt banner', () => {
  it('renders nothing before an update event', () => {
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the banner after sw-update-available fires', () => {
    render(<UpdatePrompt />);
    fireUpdateEvent();
    expect(screen.getByText('New version available')).toBeInTheDocument();
  });

  it('shows Update and Later buttons', () => {
    render(<UpdatePrompt />);
    fireUpdateEvent();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Later' })).toBeInTheDocument();
  });
});

// ── Backup dialog ─────────────────────────────────────────────────────────────

describe('UpdatePrompt backup dialog', () => {
  it('opens the backup dialog when Update is clicked', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(screen.getByText('Back up before updating?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Backup & Update' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update anyway' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows Include photos checkbox unchecked by default', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: 'Update' }));

    const checkbox = screen.getByRole('checkbox', { name: 'Include photos' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('closes the dialog on Cancel without applying update', async () => {
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: 'Update' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Back up before updating?')).not.toBeInTheDocument();
    expect(screen.getByText('New version available')).toBeInTheDocument();
  });

  it('calls exportData(false) by default on Backup & Update', async () => {
    const { exportData } = await import('@/lib/backup');
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: 'Update' }));
    await user.click(screen.getByRole('button', { name: 'Backup & Update' }));

    expect(exportData).toHaveBeenCalledWith(false);
  });

  it('calls exportData(true) when Include photos is checked', async () => {
    const { exportData } = await import('@/lib/backup');
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: 'Update' }));
    await user.click(screen.getByRole('checkbox', { name: 'Include photos' }));
    await user.click(screen.getByRole('button', { name: 'Backup & Update' }));

    expect(exportData).toHaveBeenCalledWith(true);
  });

  it('applies update without backup on Update anyway', async () => {
    const { exportData } = await import('@/lib/backup');
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    fireUpdateEvent();

    await user.click(screen.getByRole('button', { name: 'Update' }));
    await user.click(screen.getByRole('button', { name: 'Update anyway' }));

    expect(exportData).not.toHaveBeenCalled();
    const reg = await navigator.serviceWorker.getRegistration();
    expect(reg?.waiting?.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
