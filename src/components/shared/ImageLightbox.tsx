import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
      onPointerDown={e => { e.preventDefault(); onClose(); }}
    >
      <img
        src={src}
        alt="Session photo"
        className="max-w-full max-h-full object-contain rounded-xl"
        onPointerDown={e => e.stopPropagation()}
      />
    </div>,
    document.getElementById('phone-frame')!,
  );
}
