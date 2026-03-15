import { useRef, useState } from 'react';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Drag distance (px) required to commit. Defaults to ~45% of viewport width. */
  threshold?: number;
  disabled?: boolean;
}

interface SwipeGestureResult {
  /** Current drag offset in px (0 when not dragging) */
  dragX: number;
  isDragging: boolean;
  /** True for 250ms after a cancelled (snap-back) release — use for snap-back transition */
  isSnapping: boolean;
  onPointerDown: (e: PointerEvent | React.PointerEvent) => void;
  onPointerMove: (e: PointerEvent | React.PointerEvent) => void;
  onPointerUp: (e: PointerEvent | React.PointerEvent) => void;
  onPointerCancel: () => void;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = typeof window !== 'undefined' ? Math.max(window.innerWidth * 0.45, 40) : 40,
  disabled = false,
}: UseSwipeGestureOptions): SwipeGestureResult {
  const startX = useRef<number | null>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  function onPointerDown(e: PointerEvent | React.PointerEvent): void {
    if (disabled) return;
    startX.current = e.clientX;
    setIsDragging(true);
    if (snapTimer.current) {
      clearTimeout(snapTimer.current);
      setIsSnapping(false);
    }
    const el = (e as React.PointerEvent).currentTarget as Element | null;
    if (el && 'setPointerCapture' in el) {
      (el as Element).setPointerCapture((e as PointerEvent).pointerId);
    }
  }

  function onPointerMove(e: PointerEvent | React.PointerEvent): void {
    if (startX.current === null) return;
    setDragX(e.clientX - startX.current);
  }

  function onPointerUp(e: PointerEvent | React.PointerEvent): void {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    startX.current = null;
    setIsDragging(false);
    setDragX(0);

    if (Math.abs(delta) < threshold) {
      // Snap back — enable transition briefly so card animates back to center
      setIsSnapping(true);
      snapTimer.current = setTimeout(() => setIsSnapping(false), 250);
      return;
    }

    if (delta < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  }

  function onPointerCancel(): void {
    startX.current = null;
    setIsDragging(false);
    setDragX(0);
    setIsSnapping(true);
    snapTimer.current = setTimeout(() => setIsSnapping(false), 250);
  }

  return { dragX, isDragging, isSnapping, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
