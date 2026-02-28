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
    <div className={cn('flex border-b border-outline/30', className)}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium border-r last:border-r-0 border-outline/30',
            value === opt.value
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant bg-surface',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
