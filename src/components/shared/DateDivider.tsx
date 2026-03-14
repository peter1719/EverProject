/**
 * Date divider component for session history lists.
 * Formats and displays dates (e.g. "Today", "Yesterday", or full date string).
 * Dependencies: cn()
 */
import { cn } from '@/lib/utils';

interface DateDividerProps {
  /** YYYY-MM-DD */
  dateStr: string;
  className?: string;
}

/** Date group header: label + horizontal rule. */
export function DateDivider({ dateStr, className }: DateDividerProps): React.ReactElement {
  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs font-medium text-on-surface-variant shrink-0">{label}</span>
      <div className="flex-1 border-t border-outline/30" />
    </div>
  );
}
