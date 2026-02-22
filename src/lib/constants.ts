import type { ProjectColor } from '@/types';

export const APP_NAME = 'EverProject';
export const DB_NAME = 'ever-project-db';
export const DB_VERSION = 1;

export const MAX_PROJECT_NAME_LENGTH = 30;
export const MAX_NOTES_LENGTH = 500;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 999] as const;
/** Sentinel value meaning "more than 3 hours / open-ended". */
export const OPEN_DURATION = 999;

export const COLOR_PALETTE: ProjectColor[] = [
  'indigo',
  'violet',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'sky',
  'slate',
  'stone',
];

/** Maps ProjectColor keys to Tailwind bg classes (static — no dynamic interpolation). */
export const COLOR_BG_MAP: Record<ProjectColor, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-500',
  stone: 'bg-stone-500',
};

/** Maps ProjectColor keys to raw CSS hex values (for canvas, SVG, inline style). */
export const COLOR_HEX_MAP: Record<ProjectColor, string> = {
  indigo: '#6366f1',
  violet: '#8b5cf6',
  pink: '#ec4899',
  rose: '#f43f5e',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  slate: '#64748b',
  stone: '#78716c',
};
