import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

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
        <Button variant="filled" onClick={cta.onClick} className="px-6">
          {cta.label}
        </Button>
      )}
    </div>
  );
}
