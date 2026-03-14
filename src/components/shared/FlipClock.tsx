/**
 * Flip-digit countdown display component (used on the Timer page).
 * Formats seconds into MM:SS or HH:MM:SS with CSS flip animations.
 * Dependencies: none (pure UI)
 */
import { useEffect, useState } from 'react';

interface FlipDigitProps {
  digit: string;
  size: 'lg' | 'md' | 'sm';
}

function FlipDigit({ digit, size }: FlipDigitProps) {
  // Derived state: update prev/current during render when digit prop changes
  // (React's recommended pattern for state derived from props — avoids useEffect setState)
  const [prev, setPrev] = useState(digit);
  const [current, setCurrent] = useState(digit);
  const [flipping, setFlipping] = useState(false);

  if (digit !== current) {
    setPrev(current);
    setCurrent(digit);
    setFlipping(true);
  }

  // Only responsible for clearing the flip flag after animation completes
  useEffect(() => {
    if (!flipping) return;
    const id = setTimeout(() => setFlipping(false), 400);
    return () => clearTimeout(id);
  }, [current, flipping]); // re-run when digit changes to restart the 400ms window

  const card =
    size === 'lg' ? 'w-[72px] h-[100px] text-5xl' :
    size === 'md' ? 'w-14 h-20 text-4xl' :
                    'w-10 h-14 text-3xl';

  return (
    <div
      className={`relative ${card} bg-surface-variant border border-outline/40 rounded-lg overflow-hidden select-none`}
      style={{ perspective: '400px' }}
    >
      {/* Static background: new digit centred */}
      <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-on-surface">
        {current}
      </div>

      {/* Centre divider line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-outline/30 z-10" />

      {flipping && (
        <>
          {/* Top flap: prev digit top half folds down */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden z-20 bg-surface-variant rounded-t-lg"
            style={{
              transformOrigin: 'bottom center',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              animation: 'paper-flip-top 200ms cubic-bezier(0.4, 0, 1, 1) forwards',
            }}
          >
            <div
              className="absolute inset-x-0 top-0 flex items-end justify-center font-mono font-bold text-on-surface"
              style={{ height: '200%' }}
            >
              {prev}
            </div>
          </div>

          {/* Bottom flap: new digit bottom half unfolds open */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden z-20 bg-surface-variant rounded-b-lg"
            style={{
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
              animation: 'paper-flip-bottom 200ms cubic-bezier(0, 0, 0.2, 1) 200ms both',
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 flex items-start justify-center font-mono font-bold text-on-surface"
              style={{ height: '200%' }}
            >
              {current}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface FlipClockProps {
  mm: string;
  ss: string;
  size?: 'lg' | 'md' | 'sm';
}

export function FlipClock({ mm, ss, size = 'lg' }: FlipClockProps) {
  const gap = size === 'lg' ? 'gap-2' : size === 'md' ? 'gap-1.5' : 'gap-1';
  const colonSize = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl';

  return (
    <div className={`flex items-center ${gap}`}>
      <FlipDigit digit={mm[0]} size={size} />
      <FlipDigit digit={mm[1]} size={size} />
      <span className={`font-mono font-bold text-on-surface ${colonSize} mx-0.5 leading-none`}>:</span>
      <FlipDigit digit={ss[0]} size={size} />
      <FlipDigit digit={ss[1]} size={size} />
    </div>
  );
}
