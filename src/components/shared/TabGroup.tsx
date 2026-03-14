/**
 * Horizontal tab switcher component.
 * Multiple tab options; active tab is filled; click to switch.
 * Dependencies: cn()
 */
import { cn } from '@/lib/utils';

interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface TabGroupProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

/** Horizontal segmented tab bar with filled active state. */
export function TabGroup<T extends string>({
  options,
  value,
  onChange,
  className,
}: TabGroupProps<T>): React.ReactElement {
  return (
    <div className={cn('flex gap-1 px-4 py-2 border-b border-outline/30', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium rounded-xl transition-colors duration-150',
            value === opt.value
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
