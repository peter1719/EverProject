/**
 * Session outcome selection toggle (Completed / Partial / Abandoned).
 * Three-segment selector; each option has a distinct color and icon.
 * Dependencies: cn(), lucide-react
 */
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { SessionOutcome } from '@/types';

interface OutcomeToggleProps {
  value: SessionOutcome;
  onChange: (v: SessionOutcome) => void;
  /** Include the third "Abandoned" option. Default: false (2-option: Done / Partial). */
  includeAbandoned?: boolean;
  /** Show only icon symbols instead of full labels. Default: false. */
  compactLabels?: boolean;
}

const COMPACT_LABELS: Record<SessionOutcome, string> = {
  completed: '✓',
  partial: '~',
  abandoned: '✕',
};

const ACTIVE_CLASSES: Record<SessionOutcome, string> = {
  completed: 'bg-success text-white',
  partial: 'bg-warning text-white',
  abandoned: 'bg-error text-white',
};

const OUTCOME_KEYS: SessionOutcome[] = ['completed', 'partial', 'abandoned'];
const LABEL_KEYS: Record<SessionOutcome, string> = {
  completed: 'outcome.done',
  partial: 'outcome.partial',
  abandoned: 'outcome.abandoned',
};

/** Segmented toggle for session outcome. */
export function OutcomeToggle({
  value,
  onChange,
  includeAbandoned = false,
  compactLabels = false,
}: OutcomeToggleProps): React.ReactElement {
  const { t } = useTranslation();
  const outcomes = includeAbandoned ? OUTCOME_KEYS : OUTCOME_KEYS.slice(0, 2);

  return (
    <div className="flex rounded-xl overflow-hidden border border-outline/30">
      {outcomes.map((outcome, i) => (
        <button
          key={outcome}
          onClick={() => onChange(outcome)}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-none',
            i < outcomes.length - 1 ? 'border-r border-outline/30' : '',
            value === outcome ? ACTIVE_CLASSES[outcome] : 'text-on-surface-variant',
          )}
        >
          {compactLabels ? COMPACT_LABELS[outcome] : t(LABEL_KEYS[outcome])}
        </button>
      ))}
    </div>
  );
}
