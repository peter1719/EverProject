import { describe, it, expect } from 'vitest';
import { cn, formatDuration, formatDurationLong, toDateString, daysBetween } from './utils';

// ── cn ─────────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges conflicting Tailwind classes — last wins', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('filters falsy values', () => {
    expect(cn('base', false, undefined, 'active')).toBe('base active');
  });

  it('handles a single class', () => {
    expect(cn('flex')).toBe('flex');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

// ── formatDuration ─────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('returns "0m" for 0 minutes', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('returns "15m" for 15 minutes', () => {
    expect(formatDuration(15)).toBe('15m');
  });

  it('returns "59m" for 59 minutes', () => {
    expect(formatDuration(59)).toBe('59m');
  });

  it('returns "1h" for exactly 60 minutes', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('returns "1h 30m" for 90 minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('returns "2h 5m" for 125 minutes', () => {
    expect(formatDuration(125)).toBe('2h 5m');
  });

  it('returns "2h" for 120 minutes (exact multiple)', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('returns "3h" for 180 minutes (exact multiple)', () => {
    expect(formatDuration(180)).toBe('3h');
  });
});

// ── formatDurationLong ─────────────────────────────────────────────────────

describe('formatDurationLong', () => {
  it('< 60 min → Xm', () => {
    expect(formatDurationLong(45)).toBe('45m');
    expect(formatDurationLong(0)).toBe('0m');
    expect(formatDurationLong(59)).toBe('59m');
  });

  it('exact hours → Xh', () => {
    expect(formatDurationLong(60)).toBe('1h');
    expect(formatDurationLong(120)).toBe('2h');
  });

  it('hours + minutes → Xh-Ym', () => {
    expect(formatDurationLong(90)).toBe('1h-30m');
    expect(formatDurationLong(125)).toBe('2h-5m');
  });

  it('exact days → Xd', () => {
    expect(formatDurationLong(1440)).toBe('1d');
    expect(formatDurationLong(2880)).toBe('2d');
  });

  it('days + hours → Xd-Yh', () => {
    expect(formatDurationLong(25 * 1440 + 10 * 60)).toBe('25d-10h');
  });

  it('days + hours + minutes → Xd-Yh-Zm', () => {
    expect(formatDurationLong(3 * 1440 + 5 * 60 + 24)).toBe('3d-5h-24m');
  });

  it('days + minutes only (no hours) → Xd-Ym', () => {
    expect(formatDurationLong(1440 + 30)).toBe('1d-30m');
  });
});

// ── toDateString ───────────────────────────────────────────────────────────

describe('toDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    const ts = new Date('2026-02-21T00:00:00.000Z').getTime();
    expect(toDateString(ts)).toBe('2026-02-21');
  });

  it('handles epoch (0)', () => {
    expect(toDateString(0)).toBe('1970-01-01');
  });

  it('keeps leading zeros for single-digit months and days', () => {
    const ts = new Date('2026-01-05T00:00:00.000Z').getTime();
    expect(toDateString(ts)).toBe('2026-01-05');
  });
});

// ── daysBetween ────────────────────────────────────────────────────────────

describe('daysBetween', () => {
  it('returns 0 for timestamps on the same calendar day', () => {
    const base = new Date('2026-02-21T00:00:00.000Z').getTime();
    expect(daysBetween(base, base + 3_600_000)).toBe(0);
  });

  it('returns 1 for exactly one UTC day apart', () => {
    const d1 = new Date('2026-02-21T00:00:00.000Z').getTime();
    const d2 = new Date('2026-02-22T00:00:00.000Z').getTime();
    expect(daysBetween(d1, d2)).toBe(1);
  });

  it('returns 7 for seven days apart', () => {
    const d1 = new Date('2026-02-14T00:00:00.000Z').getTime();
    const d2 = new Date('2026-02-21T00:00:00.000Z').getTime();
    expect(daysBetween(d1, d2)).toBe(7);
  });

  it('is order-independent (absolute value)', () => {
    const d1 = new Date('2026-02-21T00:00:00.000Z').getTime();
    const d2 = new Date('2026-02-23T00:00:00.000Z').getTime();
    expect(daysBetween(d2, d1)).toBe(daysBetween(d1, d2));
  });
});
