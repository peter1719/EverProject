import { cn } from '@/lib/utils';
import type { SessionOutcome } from '@/types';

interface OutcomeToggleProps {
  value: SessionOutcome;
  onChange: (v: SessionOutcome) => void;
  /** Include the third "Abandoned" option. Default: false (2-option: Done / Partial). */
  includeAbandoned?: boolean;
  /** Show only icon symbols instead of full labels. Default: false. */
  compactLabels?: boolean;
}

const ALL_OPTIONS: Array<{
  label: string;
  compactLabel: string;
  value: SessionOutcome;
  activeClass: string;
}> = [
  { label: '✓ Done', compactLabel: '✓', value: 'completed', activeClass: 'bg-success text-white' },
  { label: '~ Partial', compactLabel: '~', value: 'partial', activeClass: 'bg-warning text-white' },
  { label: '✕ Abandoned', compactLabel: '✕', value: 'abandoned', activeClass: 'bg-error text-white' },
];

/** Segmented toggle for session outcome. */
export function OutcomeToggle({
  value,
  onChange,
  includeAbandoned = false,
  compactLabels = false,
}: OutcomeToggleProps): React.ReactElement {
  const options = includeAbandoned ? ALL_OPTIONS : ALL_OPTIONS.slice(0, 2);

  return (
    <div className="flex rounded-xl overflow-hidden border border-outline/30">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-none',
            i < options.length - 1 ? 'border-r border-outline/30' : '',
            value === opt.value ? opt.activeClass : 'text-on-surface-variant',
          )}
        >
          {compactLabels ? opt.compactLabel : opt.label}
        </button>
      ))}
    </div>
  );
}
