/**
 * Project color dot indicator.
 * Renders a small circle in the project's color using COLOR_BG_MAP (never dynamic interpolation).
 * Dependencies: src/lib/constants.ts (COLOR_BG_MAP)
 */
import { COLOR_HEX_MAP } from '@/lib/constants';
import type { ProjectColor } from '@/types';

interface ColorDotProps {
  readonly color: ProjectColor;
  readonly size?: number;
}

/** MD3 filled circle in the project's color. */
export function ColorDot({ color, size = 12 }: ColorDotProps): React.ReactElement {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: COLOR_HEX_MAP[color],
        borderRadius: '50%',
        flexShrink: 0,
      }}
    />
  );
}
