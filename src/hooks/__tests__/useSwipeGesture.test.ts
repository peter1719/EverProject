import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSwipeGesture } from '../useSwipeGesture';

function makePointerEvent(clientX: number): PointerEvent {
  return { clientX } as unknown as PointerEvent;
}

describe('useSwipeGesture', () => {
  it('calls onSwipeLeft when delta < -threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(200)); });
    act(() => { result.current.onPointerUp(makePointerEvent(150)); }); // delta = -50

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('calls onSwipeRight when delta > threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerUp(makePointerEvent(150)); }); // delta = +50

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('ignores swipe below threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerUp(makePointerEvent(120)); }); // delta = +20

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does nothing when disabled=true', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 40, disabled: true }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerUp(makePointerEvent(200)); }); // delta = +100

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('resets on pointerCancel', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerCancel(); });
    act(() => { result.current.onPointerUp(makePointerEvent(200)); }); // should not trigger

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('tracks dragX during pointer move', () => {
    const { result } = renderHook(() => useSwipeGesture({ threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerMove(makePointerEvent(160)); }); // delta = +60

    expect(result.current.dragX).toBe(60);
    expect(result.current.isDragging).toBe(true);
  });

  it('resets dragX to 0 after pointerUp (committed swipe)', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeRight, threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerMove(makePointerEvent(180)); });
    act(() => { result.current.onPointerUp(makePointerEvent(180)); }); // committed

    expect(result.current.dragX).toBe(0);
    expect(result.current.isDragging).toBe(false);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    // isSnapping stays false on commit (no snap-back needed)
    expect(result.current.isSnapping).toBe(false);
  });

  it('sets isSnapping when released below threshold (snap-back)', () => {
    const { result } = renderHook(() => useSwipeGesture({ threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerMove(makePointerEvent(115)); }); // only 15px
    act(() => { result.current.onPointerUp(makePointerEvent(115)); });   // below threshold

    expect(result.current.dragX).toBe(0);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isSnapping).toBe(true); // snap-back transition active
  });

  it('resets dragX to 0 on pointerCancel and triggers snap', () => {
    const { result } = renderHook(() => useSwipeGesture({ threshold: 40 }));

    act(() => { result.current.onPointerDown(makePointerEvent(100)); });
    act(() => { result.current.onPointerMove(makePointerEvent(150)); });
    act(() => { result.current.onPointerCancel(); });

    expect(result.current.dragX).toBe(0);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isSnapping).toBe(true);
  });
});
