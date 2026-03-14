import { useState } from 'react';
import { Palette } from 'lucide-react';
import { ColorDot } from '@/components/shared/ColorDot';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProjectColor } from '@/types';

interface Props {
  colors: ProjectColor[];
  value: ProjectColor | null;
  onChange: (color: ProjectColor | null) => void;
}

export function ColorFilterDropdown({ colors, value, onChange }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  function handleSelect(color: ProjectColor | null): void {
    onChange(color);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Filter by color"
        className="flex items-center justify-center w-8 h-8 rounded-xl border border-outline text-on-surface-variant bg-transparent active:opacity-80 transition-opacity duration-100"
      >
        {value ? <ColorDot color={value} size={14} /> : <Palette className="w-3.5 h-3.5" aria-hidden />}
      </button>

      {open && (
        <>
          {/* Overlay to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Dropdown panel */}
          <div className="color-filter-menu absolute right-0 top-10 z-50 bg-surface-variant border border-outline rounded-xl shadow-lg py-1 flex flex-col items-center w-15">
            <button
              onClick={() => handleSelect(null)}
              aria-label={t('library.filterAll')}
              className="flex items-center justify-center w-full h-9 text-xs font-bold text-on-surface-variant hover:bg-black/5 active:bg-black/10 transition-colors duration-100"
            >
              {t('library.filterAll')}
            </button>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => handleSelect(color)}
                aria-label={`Filter by ${color}`}
                className="flex items-center justify-center w-full h-9 hover:bg-black/5 active:bg-black/10 transition-colors duration-100"
              >
                <ColorDot color={color} size={14} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
