/**
 * Image compression utility.
 * compressImage(file) — uses Canvas to resize images to fit within 1024×1024,
 * then outputs a JPEG dataUrl at 65% quality.
 * Used by SessionComplete to reduce photo sizes before storing in IDB.
 * Dependencies: Web API (Canvas, FileReader)
 */
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.65;

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image decode failed'));
      img.onload = () => {
        let { naturalWidth: w, naturalHeight: h } = img;
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          const ratio = MAX_DIMENSION / Math.max(w, h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas unavailable')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
