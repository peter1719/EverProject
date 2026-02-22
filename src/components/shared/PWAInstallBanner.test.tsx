import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PWAInstallBanner } from './PWAInstallBanner';

// Mock the hook at module level — each test sets its own return value
const mockUsePWAInstall = vi.fn();
vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => mockUsePWAInstall(),
}));

// ── hidden states ─────────────────────────────────────────────────────────────

describe('PWAInstallBanner hidden states', () => {
  it('renders nothing when canInstall is false', () => {
    mockUsePWAInstall.mockReturnValue({
      canInstall: false,
      isInstalled: false,
      promptInstall: vi.fn(),
    });
    const { container } = render(<PWAInstallBanner />);
    // Fragment returns empty
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when isInstalled is true (even if canInstall is true)', () => {
    mockUsePWAInstall.mockReturnValue({
      canInstall: true,
      isInstalled: true,
      promptInstall: vi.fn(),
    });
    const { container } = render(<PWAInstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ── visible state ─────────────────────────────────────────────────────────────

describe('PWAInstallBanner visible state', () => {
  beforeEach(() => {
    mockUsePWAInstall.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: vi.fn(),
    });
  });

  it('shows "Add to home screen" text', () => {
    render(<PWAInstallBanner />);
    expect(screen.getByText('Add to home screen')).toBeInTheDocument();
  });

  it('shows an Install button', () => {
    render(<PWAInstallBanner />);
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });
});

// ── INSTALL button interaction ────────────────────────────────────────────────

describe('PWAInstallBanner INSTALL button', () => {
  it('calls promptInstall when INSTALL is clicked', async () => {
    const user = userEvent.setup();
    const promptInstall = vi.fn().mockResolvedValue(undefined);
    mockUsePWAInstall.mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall,
    });

    render(<PWAInstallBanner />);
    await user.click(screen.getByRole('button', { name: 'Install' }));
    expect(promptInstall).toHaveBeenCalledOnce();
  });
});
