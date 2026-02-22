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
