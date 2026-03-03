import { useState } from 'react';
import { ProjectNameRow } from './ProjectNameRow';
import { SwipeableSessionCard } from './SwipeableSessionCard';
import { SessionListItem } from './SessionListItem';
import { useSessionImage } from '@/hooks/useSessionImage';
import { ImageLightbox } from './ImageLightbox';
import type { Session, Project } from '@/types';

interface ComboSessionCardProps {
  readonly sessions: Session[];
  readonly projects: Project[];
  readonly onEditSession: (session: Session) => void;
  readonly onDeleteGroup: () => void;
  readonly onDeleteSession: (session: Session) => void;
  readonly resetToken?: number;
}

/**
 * Combo session card with expand/collapse and swipeable delete.
 * Collapsed: single swipeable card showing combo summary.
 * Expanded: header + indented per-session swipeable cards.
 */
export function ComboSessionCard({
  sessions,
  projects,
  onEditSession,
  onDeleteGroup,
  onDeleteSession,
  resetToken,
}: ComboSessionCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const totalMinutes = sessions.reduce((s, sess) => s + sess.actualDurationMinutes, 0);
  const lastNotes = sessions.find(s => s.notes)?.notes;

  const firstImageSession = sessions.find(s => s.hasImage);
  const firstImageDataUrl = useSessionImage(
    firstImageSession?.id ?? '',
    !!firstImageSession,
  );

  if (expanded) {
    return (
      <>
        <div className="flex flex-col">
          {/* Collapsible header */}
          <div
            className="bg-surface-variant shadow-sm px-4 py-4 rounded-xl flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity duration-100"
            onClick={() => setExpanded(false)}
          >
            <span className="text-base text-primary">⧉</span>
            <span className="flex-1 text-sm font-medium text-on-surface">Combo session</span>
            <span className="text-xs text-on-surface-variant shrink-0">{totalMinutes}M</span>
            <span className="text-xs text-on-surface-variant ml-2">▲</span>
          </div>

          {/* Individual session cards — indented with left-border hierarchy line */}
          <div className="ml-3 flex flex-col gap-2 border-l-2 border-primary/40 pl-3 py-2 pr-1 bg-surface rounded-r-xl">
            {sessions.map(session => {
              const project = projects.find(p => p.id === session.projectId);
              return (
                <SwipeableSessionCard
                  key={session.id}
                  onClick={() => onEditSession(session)}
                  onDelete={() => onDeleteSession(session)}
                  resetToken={resetToken}
                >
                  <SessionListItem
                    session={session}
                    projectColor={project?.color ?? session.projectColor}
                    projectName={project?.name ?? session.projectName}
                    onLightbox={setLightboxSrc}
                  />
                </SwipeableSessionCard>
              );
            })}
          </div>
        </div>

        {lightboxSrc && (
          <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        )}
      </>
    );
  }

  return (
    <>
    <SwipeableSessionCard
      onClick={() => setExpanded(true)}
      onDelete={onDeleteGroup}
      resetToken={resetToken}
    >
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-base text-primary">⧉</span>
          <span className="flex-1 text-sm font-medium text-on-surface">Combo session</span>
          <span className="text-xs text-on-surface-variant shrink-0">{totalMinutes}M</span>
        </div>

        {/* Per-project sub-rows */}
        {sessions.map(s => {
          const project = projects.find(p => p.id === s.projectId);
          return (
            <ProjectNameRow
              key={s.id}
              color={project?.color ?? s.projectColor}
              name={project?.name ?? s.projectName}
              dotSize={10}
              indent
              textSize="xs"
              textColor="on-surface-variant"
            />
          );
        })}

        {lastNotes && (
          <p className="text-xs text-on-surface-variant truncate pl-4 italic">
            "{lastNotes}"
          </p>
        )}

        {firstImageSession && (
          <div className="mt-1">
            {firstImageDataUrl ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setLightboxSrc(firstImageDataUrl); }}
                className="block rounded-xl overflow-hidden active:opacity-80 transition-opacity duration-100"
                style={{ width: 160, aspectRatio: '4/3' }}
              >
                <img
                  src={firstImageDataUrl}
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
    </SwipeableSessionCard>

    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}
    </>
  );
}
