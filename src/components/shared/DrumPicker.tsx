import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelProps {
  value: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}

function DrumWheel({ value, max, label, onChange }: WheelProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = Array.from({ length: max + 1 }, (_, i) => i);

  // Initial scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = value * ITEM_HEIGHT;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when value changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const current = Math.round(el.scrollTop / ITEM_HEIGHT);
    if (current !== value) {
      el.scrollTo({ top: value * ITEM_HEIGHT, behavior: 'smooth' });
    }
  }, [value]);

  const handleScroll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const snapped = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(max, snapped));
      el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
      onChange(clamped);
    }, 150);
  }, [max, onChange]);

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.max(0, value - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.min(max, value + 1));
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative w-full outline-none"
        style={{ height: CONTAINER_HEIGHT }}
      >
        {/* Gradient mask — inline style required (Tailwind v4 doesn't support mask-image) */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
          }}
        />

        {/* Highlight bar for selected item */}
        <div
          className="absolute left-0 right-0 z-0 rounded-lg bg-primary/10 border border-primary/30"
          style={{
            top: ITEM_HEIGHT * 1,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-scroll"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          {/* Top padding */}
          <div style={{ height: ITEM_HEIGHT * 1 }} />
          {items.map(i => (
            <div
              key={i}
              style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
              className="flex items-center justify-center text-base font-medium tabular-nums text-on-surface select-none"
            >
              {i}
            </div>
          ))}
          {/* Bottom padding */}
          <div style={{ height: ITEM_HEIGHT * 1 }} />
        </div>
      </div>
      <span className="text-xs text-on-surface-variant">{label}</span>
    </div>
  );
}

interface DrumPickerProps {
  days: number;
  hours: number;
  onChange: (days: number, hours: number) => void;
}

export function DrumPicker({ days, hours, onChange }: DrumPickerProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 w-36">
      <DrumWheel
        value={days}
        max={99}
        label={t('form.days')}
        onChange={d => onChange(d, hours)}
      />
      <div className="flex items-center justify-center text-on-surface-variant font-medium pb-6">:</div>
      <DrumWheel
        value={hours}
        max={23}
        label={t('form.hours')}
        onChange={h => onChange(days, h)}
      />
    </div>
  );
}
