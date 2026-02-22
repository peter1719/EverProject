import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly height?: string;
}

/**
 * Mobile-style bottom sheet with MD3 styling.
 * Traps scroll and blocks interaction with content behind it.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  height = '50dvh',
}: BottomSheetProps): React.ReactElement {
  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black transition-opacity',
          isOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 100 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'safe-bottom fixed left-0 right-0 bottom-0 rounded-t-3xl bg-surface transition-transform flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className,
        )}
        style={{ zIndex: 101, height }}
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 mb-1 h-1 w-9 rounded-full bg-outline/40 shrink-0" />

        {title && (
          <div className="border-b border-outline/30 px-4 py-3 shrink-0">
            <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
