import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from './usePWAInstall';

// jsdom does not provide matchMedia — setup.ts stubs it with matches: false
// so isInstalled initialises to false in all tests below.

function fireBeforeInstallPrompt(): { prompt: ReturnType<typeof vi.fn>; userChoice: Promise<{ outcome: string }> } {
  const promptFn = vi.fn().mockResolvedValue(undefined);
  const userChoicePromise = Promise.resolve({ outcome: 'accepted' });
  const event = Object.assign(new Event('beforeinstallprompt'), {
    preventDefault: vi.fn(),
    prompt: promptFn,
    userChoice: userChoicePromise,
  });
  window.dispatchEvent(event);
  return { prompt: promptFn, userChoice: userChoicePromise };
}

function fireAppInstalled(): void {
  window.dispatchEvent(new Event('appinstalled'));
}

beforeEach(() => {
  // Ensure matchMedia returns matches: false (standalone = false)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

// ── initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('canInstall is false before beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.canInstall).toBe(false);
  });

  it('isInstalled is false when not in standalone mode', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstalled).toBe(false);
  });

  it('isInstalled is true when display-mode is standalone', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstalled).toBe(true);
  });
});

// ── beforeinstallprompt event ─────────────────────────────────────────────────

describe('beforeinstallprompt event', () => {
  it('sets canInstall to true', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { fireBeforeInstallPrompt(); });
    expect(result.current.canInstall).toBe(true);
  });

  it('calls preventDefault on the event', () => {
    const promptFn = vi.fn().mockResolvedValue(undefined);
    const preventDefaultFn = vi.fn();
    const event = Object.assign(new Event('beforeinstallprompt'), {
      preventDefault: preventDefaultFn,
      prompt: promptFn,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    const { result: _ } = renderHook(() => usePWAInstall());
    act(() => { window.dispatchEvent(event); });
    expect(preventDefaultFn).toHaveBeenCalledOnce();
  });
});

// ── promptInstall ─────────────────────────────────────────────────────────────

describe('promptInstall', () => {
  it('calls .prompt() on the deferred event', async () => {
    const { result } = renderHook(() => usePWAInstall());
    let prompt!: ReturnType<typeof vi.fn>;
    // Fire event inside act so the state update is flushed before asserting
    await act(async () => {
      const { prompt: p } = fireBeforeInstallPrompt();
      prompt = p;
    });

    await act(async () => { await result.current.promptInstall(); });
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('sets isInstalled to true when outcome is accepted', async () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { fireBeforeInstallPrompt(); });

    await act(async () => { await result.current.promptInstall(); });
    expect(result.current.isInstalled).toBe(true);
  });

  it('sets canInstall to false after prompting', async () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { fireBeforeInstallPrompt(); });

    await act(async () => { await result.current.promptInstall(); });
    expect(result.current.canInstall).toBe(false);
  });

  it('is a no-op when no deferred prompt is stored', async () => {
    const { result } = renderHook(() => usePWAInstall());
    // No beforeinstallprompt fired
    await act(async () => { await result.current.promptInstall(); });
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });
});

// ── appinstalled event ────────────────────────────────────────────────────────

describe('appinstalled event', () => {
  it('sets isInstalled to true', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { fireAppInstalled(); });
    expect(result.current.isInstalled).toBe(true);
  });

  it('clears canInstall after app is installed', () => {
    const { result } = renderHook(() => usePWAInstall());
    act(() => { fireBeforeInstallPrompt(); });
    act(() => { fireAppInstalled(); });
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(true);
  });
});
