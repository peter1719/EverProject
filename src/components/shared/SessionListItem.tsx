/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils';
import { ColorDot } from './ColorDot';
import { useSessionImage } from '@/hooks/useSessionImage';
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
  /** Called when the user taps the photo thumbnail. Caller is responsible for rendering the lightbox. */
  onLightbox?: (src: string) => void;
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
  onLightbox,
  className,
}: SessionListItemProps): React.ReactElement {
  const { icon, colorClass } = outcomeStyle(session.outcome);
  const imageDataUrl = useSessionImage(session.id, !!session.hasImage);

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

      {session.hasImage && (
        <div className="mt-1 pl-6">
          {imageDataUrl ? (
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onLightbox?.(imageDataUrl); }}
              className="block rounded-xl overflow-hidden active:opacity-80 transition-opacity duration-100"
              style={{ width: 160, aspectRatio: '4/3' }}
            >
              <img
                src={imageDataUrl}
                alt="Session photo"
                className="w-full h-full object-cover object-center"
              />
            </button>
          ) : (
            <div
              className="rounded-xl bg-surface-variant animate-pulse"
              style={{ width: 160, aspectRatio: '4/3' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
