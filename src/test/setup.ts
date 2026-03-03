import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Create the #phone-frame element that ImageLightbox portals into
const phoneFrame = document.createElement('div');
phoneFrame.id = 'phone-frame';
document.body.appendChild(phoneFrame);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// matchMedia not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Wake Lock API stub
Object.defineProperty(navigator, 'wakeLock', {
  writable: true,
  value: { request: vi.fn().mockResolvedValue({ release: vi.fn() }) },
});

// Vibration API stub
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
});

// Deterministic UUIDs per test run
let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
});
Object.defineProperty(globalThis, 'crypto', {
  writable: true,
  value: {
    ...globalThis.crypto,
    randomUUID: () => `test-uuid-${++uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`,
  },
});

// scrollIntoView not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn();
