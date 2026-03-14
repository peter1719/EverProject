/**
 * Project color accent strip (left-side or top-side decorative bar on cards).
 * Renders a thin strip in the project's color using COLOR_BG_MAP.
 * Dependencies: src/lib/constants.ts (COLOR_BG_MAP)
 */
import { cn } from '@/lib/utils';
import { COLOR_HEX_MAP } from '@/lib/constants';
import type { ProjectColor } from '@/types';

interface ProjectColorStripProps {
  colors: ProjectColor[];
  /** Tailwind height class. Default: 'h-1.5'. */
  height?: string;
  className?: string;
}

/** Horizontal color bar with equal-width segments for each project color. */
export function ProjectColorStrip({
  colors,
  height = 'h-1.5',
  className,
}: ProjectColorStripProps): React.ReactElement {
  return (
    <div className={cn('flex', height, className)}>
      {colors.map((color, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ backgroundColor: COLOR_HEX_MAP[color] }}
        />
      ))}
    </div>
  );
}
