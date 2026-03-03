import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageLightbox } from './ImageLightbox';
import { BottomSheet } from './BottomSheet';

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

  it('click on the backdrop calls onClose', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    const backdrop = screen.getByAltText('Session photo').parentElement!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('click on the image does NOT propagate to the backdrop (lightbox stays open)', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    fireEvent.click(screen.getByAltText('Session photo'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  /**
   * Regression: closing the lightbox by tapping its backdrop must NOT also
   * dismiss an underlying BottomSheet.
   *
   * The lightbox closes on `click`. After `click` fires and the lightbox
   * unmounts, no further synthetic events are generated, so the BottomSheet
   * backdrop never receives a click and remains open.
   */
  it('clicking the lightbox backdrop does NOT dismiss an underlying BottomSheet', () => {
    const lightboxClose = vi.fn();
    const sheetClose = vi.fn();

    function Fixture(): React.ReactElement {
      const [lightboxOpen, setLightboxOpen] = useState(true);
      return (
        <>
          <BottomSheet isOpen onClose={sheetClose}><span>content</span></BottomSheet>
          {lightboxOpen && (
            <ImageLightbox
              src={SRC}
              onClose={() => { lightboxClose(); setLightboxOpen(false); }}
            />
          )}
        </>
      );
    }

    render(<Fixture />);

    // Click the lightbox backdrop → lightbox closes, BottomSheet is untouched
    const lightboxBackdrop = screen.getByAltText('Session photo').parentElement!;
    fireEvent.click(lightboxBackdrop);

    expect(lightboxClose).toHaveBeenCalledOnce();
    expect(sheetClose).not.toHaveBeenCalled();
  });
});
