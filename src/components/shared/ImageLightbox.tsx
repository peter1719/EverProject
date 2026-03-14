/**
 * Full-screen image viewer.
 * Dark overlay + enlarged image; closes on background tap or Escape key; rendered via React portal.
 * Dependencies: React portal
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function ImageLightbox({
  src,
  onClose,
}: {
  readonly src: string;
  readonly onClose: () => void;
}): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4"
      onClick={onClose}
    >
      <button
        aria-label="Close"
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-white/15 text-white active:bg-white/30 transition-colors duration-100"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt="Session photo"
        className="max-w-full max-h-full object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.getElementById('phone-frame') ?? document.body,
  );
}
