/**
 * Swipeable session card with delete action.
 * Swipe left to reveal delete button; triggers sessionStore.deleteSession.
 * Dependencies: sessionStore, SessionListItem
 */
import { useReducer, useRef, useEffect } from 'react';
import { PixelDialog } from './PixelDialog';

const REVEAL_WIDTH = 72;
const DRAG_THRESHOLD = 8;
const SNAP_THRESHOLD = 30;

type SwipeState = {
  offset: number;
  revealed: boolean;
  isDragging: boolean;
  pendingDelete: boolean;
};

const INITIAL: SwipeState = { offset: 0, revealed: false, isDragging: false, pendingDelete: false };

type SwipeAction =
  | { type: 'RESET' }
  | { type: 'DRAG_START'; revealed: boolean }
  | { type: 'DRAG_MOVE'; offset: number }
  | { type: 'DRAG_CANCEL_VERTICAL'; offset: number }
  | { type: 'SNAP_OPEN' }
  | { type: 'SNAP_CLOSE' }
  | { type: 'KEEP_CURRENT'; revealed: boolean }
  | { type: 'CLOSE_REVEAL' }
  | { type: 'PENDING_DELETE'; value: boolean }
  | { type: 'CONFIRM_DELETE' };

function reducer(state: SwipeState, action: SwipeAction): SwipeState {
  switch (action.type) {
    case 'RESET':                return INITIAL;
    case 'DRAG_START':           return { ...state, isDragging: true };
    case 'DRAG_MOVE':            return { ...state, offset: action.offset };
    case 'DRAG_CANCEL_VERTICAL': return { ...state, isDragging: false, offset: action.offset };
    case 'SNAP_OPEN':            return { ...state, isDragging: false, offset: -REVEAL_WIDTH, revealed: true };
    case 'SNAP_CLOSE':           return { ...state, isDragging: false, offset: 0, revealed: false };
    case 'KEEP_CURRENT':         return { ...state, isDragging: false, offset: action.revealed ? -REVEAL_WIDTH : 0 };
    case 'CLOSE_REVEAL':         return { ...state, offset: 0, revealed: false };
    case 'PENDING_DELETE':       return { ...state, pendingDelete: action.value };
    case 'CONFIRM_DELETE':       return { ...state, pendingDelete: false, offset: 0, revealed: false };
  }
}

interface SwipeableSessionCardProps {
  readonly children: React.ReactNode;
  readonly onDelete: () => void;
  readonly onClick: () => void;
  readonly resetToken?: number;
}

export function SwipeableSessionCard({
  children,
  onDelete,
  onClick,
  resetToken,
}: SwipeableSessionCardProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { offset, revealed, isDragging, pendingDelete } = state;

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  // Close when user taps anywhere outside this card
  useEffect(() => {
    if (!revealed) return;
    function onDocPointerDown(e: PointerEvent): void {
      if (!containerRef.current?.contains(e.target as Node)) {
        dispatch({ type: 'CLOSE_REVEAL' });
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [revealed]);

  // Reset drag state whenever parent increments resetToken (skip initial mount)
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return; }
    dispatch({ type: 'RESET' });
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
  }, [resetToken]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    baseOffsetRef.current = revealed ? -REVEAL_WIDTH : 0;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dispatch({ type: 'DRAG_START', revealed });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    // Let vertical scroll win when it clearly dominates
    if (!hasDraggedRef.current && Math.abs(dy) > Math.abs(dx)) {
      isDraggingRef.current = false;
      dispatch({ type: 'DRAG_CANCEL_VERTICAL', offset: baseOffsetRef.current });
      return;
    }
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    hasDraggedRef.current = true;
    dispatch({ type: 'DRAG_MOVE', offset: Math.min(0, Math.max(-REVEAL_WIDTH, baseOffsetRef.current + dx)) });
  }

  function handlePointerUp(): void {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = offset - baseOffsetRef.current;
    if (dx < -SNAP_THRESHOLD) {
      dispatch({ type: 'SNAP_OPEN' });
    } else if (dx > SNAP_THRESHOLD && revealed) {
      dispatch({ type: 'SNAP_CLOSE' });
    } else {
      dispatch({ type: 'KEEP_CURRENT', revealed });
    }
  }

  function handleClick(): void {
    if (hasDraggedRef.current) return;
    if (revealed) {
      dispatch({ type: 'CLOSE_REVEAL' });
    } else {
      onClick();
    }
  }

  return (
    <div ref={containerRef} className="overflow-hidden rounded-xl">
      {/* Flex row: card + delete zone slide together so hit areas stay correct */}
      <div
        style={{
          display: 'flex',
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {/* Card */}
        <div
          className="bg-surface-variant shadow-sm px-4 py-4 w-full shrink-0"
          style={{
            touchAction: 'pan-y',
            cursor: 'pointer',
            userSelect: 'none',
            minHeight: 68,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
        >
          {children}
        </div>

        {/* Delete zone — always REVEAL_WIDTH px to the right; clipped until swiped */}
        <div
          className="bg-error shrink-0 flex items-center justify-center"
          style={{ width: REVEAL_WIDTH }}
        >
          <button
            className="h-full w-full flex items-center justify-center text-white text-sm font-medium"
            onClick={() => dispatch({ type: 'PENDING_DELETE', value: true })}
          >
            Delete
          </button>
        </div>
      </div>

      <PixelDialog
        isOpen={pendingDelete}
        message="Delete this session log? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        isDanger
        onConfirm={() => {
          dispatch({ type: 'CONFIRM_DELETE' });
          onDelete();
        }}
        onCancel={() => dispatch({ type: 'PENDING_DELETE', value: false })}
        className="max-w-sm mx-auto"
      />
    </div>
  );
}
