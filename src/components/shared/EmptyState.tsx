import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateCta {
  readonly label: string;
  readonly onClick: () => void;
}

interface EmptyStateProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly cta?: EmptyStateCta;
  readonly className?: string;
}

/** MD3 empty state with icon, title, optional subtitle, and optional CTA. */
export function EmptyState({ title, subtitle, cta, className }: EmptyStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 px-6', className)}>
      <PackageOpen className="w-12 h-12 text-on-surface-variant" aria-hidden />

      <p className="text-xl font-semibold text-on-surface text-center leading-snug">
        {title}
      </p>

      {subtitle && (
        <p className="text-sm text-on-surface-variant text-center leading-snug">
          {subtitle}
        </p>
      )}

      {cta && (
        <button
          onClick={cta.onClick}
          className="h-12 px-6 rounded-xl bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100"
          style={{ minHeight: 44 }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
