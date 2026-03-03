import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

function renderSheet(isOpen: boolean, onClose = vi.fn()) {
  render(
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <span>content</span>
    </BottomSheet>,
  );
  const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
  return { backdrop, onClose };
}

describe('BottomSheet backdrop', () => {
  it('click calls onClose', () => {
    const { backdrop, onClose } = renderSheet(true);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  /**
   * Regression: the backdrop must close on `click`, NOT `pointerDown`.
   *
   * If the backdrop used `onPointerDown`, the sheet would close and set
   * `pointer-events: none` before `pointerUp` fires. The subsequent `click`
   * event would then leak through to whatever element is behind the backdrop,
   * causing unintended interactions (e.g. opening a new sheet or triggering
   * a list-item action).
   */
  it('pointerDown alone does NOT call onClose (prevents click-through to elements below)', () => {
    const { backdrop, onClose } = renderSheet(true);
    fireEvent.pointerDown(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has pointer-events-none when closed', () => {
    const { backdrop } = renderSheet(false);
    expect(backdrop).toHaveClass('pointer-events-none');
  });

  it('has pointer-events-auto when open', () => {
    const { backdrop } = renderSheet(true);
    expect(backdrop).toHaveClass('pointer-events-auto');
  });
});
