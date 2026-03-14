/**
 * MD3 surface-variant card component.
 * Supports optional left color strip (project color) and paper-style top border.
 * Dependencies: cn()
 */
import { cn } from '@/lib/utils';
import { useAppStyle } from '@/hooks/useAppStyle';

interface CardProps {
  children: React.ReactNode;
  /** Add drop shadow. Default: false. */
  shadow?: boolean;
  /** CSS hex for 4px left border stripe (e.g. suggestion cards). */
  stripeColor?: string | null;
  /** Tailwind padding class. Default: 'p-4'. Pass empty string to suppress. */
  padding?: string;
  className?: string;
  onClick?: () => void;
}

/** MD3 surface-variant card with optional shadow and left-border color stripe. */
export function Card({
  children,
  shadow = false,
  stripeColor,
  padding = 'p-4',
  className,
  onClick,
}: CardProps): React.ReactElement {
  const appStyle = useAppStyle();
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface-variant rounded-xl',
        shadow && 'shadow-sm',
        padding,
        className,
      )}
      style={stripeColor
        ? (appStyle === 'paper'
            ? { borderTop: `6px solid ${stripeColor}` }
            : { borderLeft: `4px solid ${stripeColor}` })
        : undefined}
    >
      {children}
    </div>
  );
}
