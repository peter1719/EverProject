import { cn } from '@/lib/utils';
import { ColorDot } from './ColorDot';
import type { ProjectColor } from '@/types';

interface ProjectNameRowProps {
  color: ProjectColor;
  name: string;
  dotSize?: number;
  textSize?: 'xs' | 'sm' | 'base';
  textColor?: 'on-surface' | 'on-surface-variant';
  gap?: 2 | 3;
  indent?: boolean;
  className?: string;
}

const TEXT_SIZE_CLASS: Record<'xs' | 'sm' | 'base', string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
};

const TEXT_COLOR_CLASS: Record<'on-surface' | 'on-surface-variant', string> = {
  'on-surface': 'text-on-surface',
  'on-surface-variant': 'text-on-surface-variant',
};

const GAP_CLASS: Record<2 | 3, string> = {
  2: 'gap-2',
  3: 'gap-3',
};

/** ColorDot + project name in a flex row. Width fills parent by default. */
export function ProjectNameRow({
  color,
  name,
  dotSize = 12,
  textSize = 'sm',
  textColor = 'on-surface',
  gap = 2,
  indent = false,
  className,
}: ProjectNameRowProps): React.ReactElement {
  return (
    <div className={cn('flex items-center', GAP_CLASS[gap], indent && 'pl-4', className)}>
      <ColorDot color={color} size={dotSize} />
      <span
        className={cn(
          'font-medium truncate flex-1',
          TEXT_SIZE_CLASS[textSize],
          TEXT_COLOR_CLASS[textColor],
        )}
      >
        {name}
      </span>
    </div>
  );
}
