/**
 * Landscape UI detection hook.
 * Condition: innerWidth >= 480 AND width > height; debounced 150ms to prevent rotation flicker.
 * Returns: boolean (true = show landscape UI).
 * App.tsx uses this to choose between LandscapeApp and the standard router.
 */
import { useEffect, useState } from 'react';

function getIsLandscape(): boolean {
  return window.innerWidth >= 480 && window.innerWidth > window.innerHeight;
}

/**
 * Returns true when the viewport is wide enough AND wider than it is tall.
 * Equivalent to CSS: (min-width: 768px) and (min-aspect-ratio: 1/1)
 * Debounced 150ms to avoid flicker during device rotation.
 */
export function useIsLandscapeUI(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(getIsLandscape);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleResize(): void {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLandscape(getIsLandscape());
      }, 150);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  return isLandscape;
}
