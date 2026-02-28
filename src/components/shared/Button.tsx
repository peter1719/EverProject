import { cn } from '@/lib/utils';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'danger';

interface ButtonProps {
  variant?: ButtonVariant;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  'aria-label'?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: 'bg-primary text-on-primary',
  tonal: 'bg-primary-container text-on-primary-container',
  outlined: 'border border-outline text-on-surface-variant bg-transparent',
  danger: 'bg-error text-white',
};

/** MD3 button — filled, tonal, outlined, or danger. Width is caller's responsibility via className. */
export function Button({
  variant = 'filled',
  children,
  onClick,
  disabled,
  type = 'button',
  className,
  'aria-label': ariaLabel,
}: ButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'h-12 rounded-xl font-medium transition-opacity duration-100',
        VARIANT_CLASSES[variant],
        disabled ? 'opacity-[0.38] cursor-not-allowed' : 'active:opacity-80',
        className,
      )}
    >
      {children}
    </button>
  );
}
