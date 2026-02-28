import { cn } from '@/lib/utils';
import { DURATION_OPTIONS, OPEN_DURATION } from '@/lib/constants';

interface DurationSelectorProps {
  value: number;
  onChange: (mins: number) => void;
  className?: string;
}

/** 4-column duration picker using the standard DURATION_OPTIONS. */
export function DurationSelector({
  value,
  onChange,
  className,
}: DurationSelectorProps): React.ReactElement {
  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {DURATION_OPTIONS.map(mins => (
        <button
          key={mins}
          type="button"
          onClick={() => onChange(mins)}
          className={cn(
            'h-14 w-full rounded-xl font-mono text-sm font-medium active:opacity-80 transition-opacity duration-100',
            value === mins
              ? 'bg-primary text-on-primary'
              : 'border border-outline text-on-surface-variant bg-transparent',
          )}
        >
          {mins >= OPEN_DURATION ? '>180' : mins}
        </button>
      ))}
    </div>
  );
}
