/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils';
import { ColorDot } from './ColorDot';
import type { Session, ProjectColor, SessionOutcome } from '@/types';

/** Returns icon and color class for a session outcome. Exported for re-use. */
export function outcomeStyle(outcome: SessionOutcome): { icon: string; colorClass: string } {
  switch (outcome) {
    case 'completed': return { icon: '✓', colorClass: 'text-success' };
    case 'partial':   return { icon: '~', colorClass: 'text-warning' };
    case 'abandoned': return { icon: '✕', colorClass: 'text-error' };
  }
}

interface SessionListItemProps {
  session: Session;
  /** Resolved by caller — use project.color ?? session.projectColor. */
  projectColor: ProjectColor;
  /** Resolved by caller — use project.name ?? session.projectName. */
  projectName: string;
  /** Show "(no notes)" placeholder when there are no notes. Default: false. */
  showNoNotesPlaceholder?: boolean;
  className?: string;
}

/**
 * Single session row: [outcome icon] [ColorDot size=10] [name flex-1] [Xm]
 * + optional notes italic line beneath.
 */
export function SessionListItem({
  session,
  projectColor,
  projectName,
  showNoNotesPlaceholder = false,
  className,
}: SessionListItemProps): React.ReactElement {
  const { icon, colorClass } = outcomeStyle(session.outcome);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <span className={cn('text-base shrink-0', colorClass)}>{icon}</span>
        <ColorDot color={projectColor} size={10} />
        <span className="flex-1 text-sm text-on-surface truncate">{projectName}</span>
        <span className="text-xs text-on-surface-variant shrink-0">
          {session.actualDurationMinutes}M
        </span>
      </div>

      {session.notes && (
        <p className="text-xs text-on-surface-variant truncate pl-6 italic">
          "{session.notes}"
        </p>
      )}

      {!session.notes && showNoNotesPlaceholder && (
        <p className="text-xs text-on-surface-variant/50 pl-6">(no notes)</p>
      )}
    </div>
  );
}
