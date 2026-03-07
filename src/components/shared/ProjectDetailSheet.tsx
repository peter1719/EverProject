import { useState } from 'react';

import { useSessionStore } from '@/store/sessionStore';
import { COLOR_HEX_MAP } from '@/lib/constants';
import { BottomSheet } from './BottomSheet';
import { EditSessionSheet } from './EditSessionSheet';
import { SwipeableSessionCard } from './SwipeableSessionCard';
import { TodoList } from './TodoList';
import { useSessionImage } from '@/hooks/useSessionImage';
import { ImageLightbox } from './ImageLightbox';
import type { Project, Session } from '@/types';

interface ProjectDetailSheetProps {
  readonly project: Project | null;
  readonly onClose: () => void;
  readonly allowEdit?: boolean;
}

function formatNoteDate(timestamp: number): string {
  const d = new Date(timestamp);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

export function ProjectDetailSheet({ project, onClose, allowEdit = true }: ProjectDetailSheetProps): React.ReactElement {
  const sessions = useSessionStore(s => s.sessions);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [swipeResetToken, setSwipeResetToken] = useState(0);
  const [tab, setTab] = useState<'notes' | 'todo'>('todo');
  const [trackedProjectId, setTrackedProjectId] = useState<string | undefined>(project?.id);

  // Reset tab when project changes (getDerivedStateFromProps pattern — avoids useEffect)
  if (project?.id !== trackedProjectId) {
    setTrackedProjectId(project?.id);
    setTab('todo');
  }

  // All sessions for this project, oldest-first (used for badge numbering).
  const allProjectSessions = project
    ? sessions
        .filter(s => s.projectId === project.id)
        .sort((a, b) => a.startedAt - b.startedAt)
    : [];

  // Same set displayed newest-first in the timeline.
  const sessionNotes = [...allProjectSessions].reverse();

  const colorHex = project ? COLOR_HEX_MAP[project.color] : '';

  return (
    <>
    <BottomSheet isOpen={!!project} onClose={onClose} title={project?.name ?? ''} height="70dvh">
      {!!project && (
        <div className="flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-outline/20 mx-4 mt-2">
            {(['todo', 'notes'] as const).map(t => (
              <button
                key={t}
                type="button"
                className={`flex-1 py-2 text-sm font-medium transition-colors duration-150 ${
                  tab === t
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-on-surface-variant'
                }`}
                onClick={() => setTab(t)}
              >
                {t === 'notes' ? 'Notes' : 'TODO'}
              </button>
            ))}
          </div>

          {tab === 'todo' && (
            <TodoList projectId={project.id} colorHex={colorHex} />
          )}

          {tab === 'notes' && <>
          {/* Project-level note — pinned at top with colored left border */}
          {project.notes && (
            <div
              className="mx-4 mt-4 rounded-xl bg-surface-variant px-4 py-3 border-l-2"
              style={{ borderColor: colorHex }}
            >
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-1">
                Project note
              </p>
              <p className="text-sm text-on-surface leading-relaxed">{project.notes}</p>
            </div>
          )}

          {/* Session notes — vertical timeline */}
          {sessionNotes.length > 0 ? (
            <div className="relative px-4 py-4">
              {/* Vertical colored line — centered behind badges (px-4=16px + w-11/2=22px = 38px) */}
              <div
                className="absolute inset-y-0 w-0.5"
                style={{ left: '38px', backgroundColor: colorHex }}
              />

              <div className="flex flex-col gap-3">
                {sessionNotes.map(s => {
                  const sessionNum =
                    allProjectSessions.findIndex(sess => sess.id === s.id) + 1;
                  return (
                    <div key={s.id} className="flex items-start gap-3">
                      {/* Badge — stays fixed on the timeline line, outside the swipeable card */}
                      <div
                        className="relative z-10 shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white"
                        style={{
                          backgroundColor: colorHex,
                          fontSize: sessionNum >= 100 ? '11px' : '14px',
                        }}
                      >
                        {sessionNum}
                      </div>
                      {/* Note content — swipeable */}
                      <div className="flex-1 min-w-0">
                        <SwipeableSessionCard
                          onClick={() => { if (allowEdit) setEditingSession(s); }}
                          onDelete={() => { void deleteSession(s.id); setSwipeResetToken(k => k + 1); }}
                          resetToken={swipeResetToken}
                        >
                          <NoteCard
                            session={s}
                            onLightbox={setLightboxSrc}
                          />
                        </SwipeableSessionCard>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant/50 italic text-center py-8 px-4">
              No sessions yet.
            </p>
          )}
          </>}
        </div>
      )}
    </BottomSheet>
    {allowEdit && (
      <EditSessionSheet
        session={editingSession}
        onClose={() => setEditingSession(null)}
      />
    )}
    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}
    </>
  );
}

// ── NoteCard sub-component ────────────────────────────────────────────────────

// Note content only — badge is rendered by the parent alongside SwipeableSessionCard
function NoteCard({
  session,
  onLightbox,
}: {
  session: Session;
  onLightbox: (src: string) => void;
}): React.ReactElement {
  const imageDataUrl = useSessionImage(session.id, !!session.hasImage);

  return (
    <>
      {session.notes && (
        <p className="text-sm text-on-surface leading-snug">{session.notes}</p>
      )}
      {session.hasImage && (
        <div className={session.notes ? 'mt-2' : ''}>
          {imageDataUrl ? (
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onLightbox(imageDataUrl); }}
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
              className="rounded-xl bg-surface-variant/60 animate-pulse"
              style={{ width: 160, aspectRatio: '4/3' }}
            />
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-on-surface-variant">{formatNoteDate(session.startedAt)}</p>
        <p className="text-xs text-on-surface-variant">{session.actualDurationMinutes} min</p>
      </div>
    </>
  );
}
