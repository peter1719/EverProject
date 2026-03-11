import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind classes, resolving conflicts via tailwind-merge. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a duration in minutes as "Xh Ym" or "Ym" if under an hour.
 * @param minutes - Total minutes to format
 * @returns Human-readable duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes >= 999) return '>3h';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Formats a duration in minutes using the largest applicable unit.
 * < 60 min  → "Xm"
 * < 1440 min → "Xh-Ym" (Ym omitted if 0)
 * ≥ 1440 min → "Xd-Yh-Zm" (Yh / Zm omitted if 0)
 */
export function formatDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) {
    const parts: string[] = [`${d}d`];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join('-');
  }
  return m > 0 ? `${h}h-${m}m` : `${h}h`;
}

/**
 * Formats a Unix timestamp as YYYY-MM-DD string.
 * @param timestamp - Unix timestamp in ms
 */
export function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Returns the number of whole days between two Unix timestamps.
 * Returns 0 if timestamps are on the same calendar day.
 */
export function daysBetween(fromMs: number, toMs: number): number {
  const msPerDay = 86_400_000;
  const fromDay = Math.floor(fromMs / msPerDay);
  const toDay = Math.floor(toMs / msPerDay);
  return Math.abs(toDay - fromDay);
}
