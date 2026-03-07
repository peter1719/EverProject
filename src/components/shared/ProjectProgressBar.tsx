import { cn } from '@/lib/utils';

interface ProjectProgressBarProps {
  readonly totalMinutes: number;
  readonly estimatedDurationMinutes: number;
  readonly colorHex: string;
  readonly className?: string;
}

export function ProjectProgressBar({
  totalMinutes,
  estimatedDurationMinutes,
  colorHex,
  className,
}: ProjectProgressBarProps): React.ReactElement {
  const pct = estimatedDurationMinutes > 0
    ? (totalMinutes / estimatedDurationMinutes) * 100
    : 0;
  const fillPct = Math.min(pct, 100);

  return (
    <div className={cn('px-4', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-on-surface-variant/60 tabular-nums">
          {totalMinutes}m / {estimatedDurationMinutes}m
        </span>
        <span
          className={cn(
            'text-[10px] font-semibold tabular-nums',
            pct >= 100 ? 'text-success' : 'text-on-surface-variant',
          )}
        >
          {pct.toFixed(2)}%
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden bg-outline/20">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${fillPct}%`, backgroundColor: colorHex, opacity: 0.85 }}
        />
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
