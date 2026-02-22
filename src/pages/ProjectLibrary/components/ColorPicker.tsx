import { COLOR_PALETTE, COLOR_HEX_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ProjectColor } from '@/types';

interface ColorPickerProps {
  readonly value: ProjectColor;
  readonly onChange: (color: ProjectColor) => void;
}

/** 5×3 grid of color circles. Tapping one selects it with a white border highlight. */
export function ColorPicker({ value, onChange }: ColorPickerProps): React.ReactElement {
  return (
    <div className="grid grid-cols-5 gap-2">
      {COLOR_PALETTE.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={color}
          aria-pressed={value === color}
          className={cn(
            'aspect-square rounded-full border-2 transition-none',
            value === color ? 'border-on-surface shadow-sm' : 'border-transparent',
          )}
          style={{ backgroundColor: COLOR_HEX_MAP[color] }}
        >
          {value === color && (
            <span className="block text-center text-white text-sm leading-none">
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
