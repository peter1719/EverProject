/**
 * Project total duration progress bar.
 * Shows time used vs planned total (projectDurationMinutes).
 * Dependencies: cn()
 */
import { cn, formatDurationLong } from '@/lib/utils';

interface ProjectProgressBarProps {
  readonly totalMinutes: number;
  readonly projectDurationMinutes: number; // 0 = no limit
  readonly colorHex: string;
  readonly sessionCount?: number;
  readonly className?: string;
}

export function ProjectProgressBar({
  totalMinutes,
  projectDurationMinutes,
  colorHex,
  sessionCount,
  className,
}: ProjectProgressBarProps): React.ReactElement {
  const hasLimit = projectDurationMinutes > 0;
  const pct = hasLimit ? (totalMinutes / projectDurationMinutes) * 100 : 0;
  const fillPct = Math.min(pct, 100);

  const sessionSuffix = sessionCount !== undefined ? ` · ${sessionCount} sessions` : '';
  const leftLabel = hasLimit
    ? `${formatDurationLong(totalMinutes)} / ${formatDurationLong(projectDurationMinutes)}${sessionSuffix}`
    : `${formatDurationLong(totalMinutes)}${sessionSuffix}`;

  const rightLabel = hasLimit
    ? <span className={cn('text-[10px] font-semibold tabular-nums', pct >= 100 ? 'text-success' : 'text-on-surface-variant')}>{pct.toFixed(2)}%</span>
    : <span className="text-[10px] font-semibold text-on-surface-variant/50">∞</span>;

  return (
    <div className={cn('px-4', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-on-surface-variant/60 tabular-nums">
          {leftLabel}
        </span>
        {rightLabel}
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden bg-outline/20">
        {hasLimit && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${fillPct}%`, backgroundColor: colorHex, opacity: 0.85 }}
          />
        )}
        {[25, 50, 75, 100].map(tick => (
          <div
            key={tick}
            className="absolute inset-y-0 w-px"
            style={{ left: `${tick}%`, backgroundColor: 'var(--color-surface)', opacity: 0.7 }}
          />
        ))}
      </div>
    </div>
  );
}
