import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightbox } from './ImageLightbox';

const SRC = 'data:image/png;base64,abc';

describe('ImageLightbox', () => {
  it('renders the image with the provided src', () => {
    render(<ImageLightbox src={SRC} onClose={vi.fn()} />);
    expect(screen.getByAltText('Session photo')).toHaveAttribute('src', SRC);
  });

  it('pressing Escape calls onClose', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  /**
   * Regression: ghost-click prevention.
   *
   * Previously the backdrop used onClick={onClose}. On iOS Safari, tapping the
   * backdrop to close the lightbox caused a ghost click (synthesized by the OS
   * after the element disappeared) that fell through to the BottomSheet backdrop
   * underneath, closing it unexpectedly.
   *
   * The fix is to close on `pointerdown` + `e.preventDefault()`, which tells
   * the browser to suppress the subsequent click event generation.
   */
  it('pointerdown on the backdrop calls onClose', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    const backdrop = screen.getByAltText('Session photo').parentElement!;
    fireEvent.pointerDown(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('pointerdown on the image does NOT propagate to the backdrop (lightbox stays open)', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    fireEvent.pointerDown(screen.getByAltText('Session photo'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
