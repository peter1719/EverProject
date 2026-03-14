/**
 * Pixel-style confirmation dialog for destructive actions.
 * Title + description + confirm/cancel buttons; rendered via React portal.
 * Dependencies: React portal, cn()
 */
import { cn } from '@/lib/utils';

interface PixelDialogProps {
  readonly isOpen: boolean;
  readonly message: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly isDanger?: boolean;
  readonly className?: string;
}

/** MD3 confirmation dialog. */
export function PixelDialog({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  className,
}: PixelDialogProps): React.ReactElement {
  if (!isOpen) return <></>;

  return (
    <>
      <div
        className="fixed inset-0 bg-black opacity-60 pointer-events-auto"
        style={{ zIndex: 200 }}
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn('fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-surface rounded-xl p-6 shadow-xl border border-outline/20', className)}
        style={{ zIndex: 201 }}
      >
        <p className="text-base text-on-surface leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 h-12 rounded-lg font-medium active:opacity-80 transition-opacity duration-100',
              isDanger
                ? 'bg-error text-white'
                : 'bg-primary text-on-primary',
            )}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-lg border border-outline text-on-surface-variant bg-transparent font-medium active:opacity-80 transition-opacity duration-100"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </>
  );
}
