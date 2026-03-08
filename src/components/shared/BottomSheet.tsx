import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const CLOSE_THRESHOLD = 80;    // px drag to trigger close
const VELOCITY_THRESHOLD = 0.3; // px/ms flick velocity to trigger close
const TRANSITION_MS = 200;

interface BottomSheetProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly height?: string;
  readonly baseZIndex?: number;
}

/**
 * Mobile-style bottom sheet with MD3 styling.
 * Traps scroll and blocks interaction with content behind it.
 * Drag handle / title bar can be swiped down to dismiss.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  height = '50dvh',
  baseZIndex = 100,
}: BottomSheetProps): React.ReactElement {
  const sheetRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{
    startY: number;
    pointerId: number;
    lastDelta: number;
    lastTime: number;
    velocity: number;
  } | null>(null);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Animate open/close imperatively — avoids React re-render lag on state change
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = `transform ${TRANSITION_MS}ms ease-out`;
    if (isOpen) {
      // rAF ensures the browser sees translateY(100%) before animating to 0
      requestAnimationFrame(() => {
        if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
      });
    } else {
      sheet.style.transform = 'translateY(100%)';
    }
  }, [isOpen]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    pointerRef.current = {
      startY: e.clientY,
      pointerId: e.pointerId,
      lastDelta: 0,
      lastTime: e.timeStamp,
      velocity: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Remove transition so the sheet tracks the finger with zero lag
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!pointerRef.current || pointerRef.current.pointerId !== e.pointerId) return;
    const delta = Math.max(0, e.clientY - pointerRef.current.startY);
    const dt = e.timeStamp - pointerRef.current.lastTime;
    if (dt > 0) {
      pointerRef.current.velocity = (delta - pointerRef.current.lastDelta) / dt;
    }
    pointerRef.current.lastDelta = delta;
    pointerRef.current.lastTime = e.timeStamp;
    // Direct DOM update — no React re-render, maximum smoothness
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>): void {
    if (!pointerRef.current || pointerRef.current.pointerId !== e.pointerId) return;
    const { lastDelta, velocity } = pointerRef.current;
    pointerRef.current = null;
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = `transform ${TRANSITION_MS}ms ease-out`;
    if (lastDelta >= CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(() => onClose(), TRANSITION_MS);
    } else {
      sheet.style.transform = 'translateY(0)';
    }
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>): void {
    if (!pointerRef.current || pointerRef.current.pointerId !== e.pointerId) return;
    pointerRef.current = null;
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = `transform ${TRANSITION_MS}ms ease-out`;
    sheet.style.transform = 'translateY(0)';
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black transition-opacity',
          isOpen ? 'opacity-60 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: baseZIndex }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet — transform controlled imperatively via sheetRef */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'safe-bottom fixed left-0 right-0 bottom-0 rounded-t-3xl bg-surface flex flex-col',
          className,
        )}
        style={{
          zIndex: baseZIndex + 1,
          height,
          transform: 'translateY(100%)',
        }}
      >
        {/* Drag handle + title — the interactive dismiss zone */}
        <div
          className="shrink-0 touch-none cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="pt-3 pb-1 flex justify-center">
            <div className="h-1 w-9 rounded-full bg-outline/40" />
          </div>

          {title && isOpen && (
            <div className="border-b border-outline/30 px-4 py-3">
              <h2 className="text-base font-semibold text-on-surface">{title}</h2>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}
