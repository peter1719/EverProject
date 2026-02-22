import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DurationBadgeProps {
  readonly minutes: number;
  readonly className?: string;
}

/** MD3 tonal pill showing estimated duration. */
export function DurationBadge({ minutes, className }: DurationBadgeProps): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-block rounded-full bg-primary-container text-on-primary-container text-xs font-medium px-2 py-0.5',
        className,
      )}
    >
      {minutes >= 999 ? '>3h' : `~${formatDuration(minutes)}`}
    </span>
  );
}
