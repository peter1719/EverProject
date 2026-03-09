/**
 * Same content as ProjectDetailSheet, but rendered inline (no BottomSheet wrapper).
 * Used in landscape mode to display project detail in a side panel.
 */
import { useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { COLOR_HEX_MAP } from '@/lib/constants';
import { EditSessionSheet } from './EditSessionSheet';
import { SwipeableSessionCard } from './SwipeableSessionCard';
import { TodoList } from './TodoList';
import { ImageLightbox } from './ImageLightbox';
import { useSessionImage } from '@/hooks/useSessionImage';
import type { Project, Session } from '@/types';

function formatNoteDate(timestamp: number): string {
  const d = new Date(timestamp);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

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
              style={{ width: 140, aspectRatio: '4/3' }}
            >
              <img src={imageDataUrl} alt="Session photo" className="w-full h-full object-cover object-center" />
            </button>
          ) : (
            <div className="rounded-xl bg-surface-variant/60 animate-pulse" style={{ width: 140, aspectRatio: '4/3' }} />
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

interface ProjectDetailPanelProps {
  readonly project: Project;
  readonly allowEdit?: boolean;
  readonly onClose?: () => void;
}

export function ProjectDetailPanel({
  project,
  allowEdit = true,
  onClose,
}: ProjectDetailPanelProps): React.ReactElement {
  const sessions = useSessionStore(s => s.sessions);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [swipeResetToken, setSwipeResetToken] = useState(0);
  const [tab, setTab] = useState<'notes' | 'todo'>('todo');
  const [trackedProjectId, setTrackedProjectId] = useState<string>(project.id);

  // Reset tab when project changes
  if (project.id !== trackedProjectId) {
    setTrackedProjectId(project.id);
    setTab('todo');
  }

  const allProjectSessions = sessions
    .filter(s => s.projectId === project.id)
    .sort((a, b) => a.startedAt - b.startedAt);

  const sessionNotes = [...allProjectSessions].reverse();
  const colorHex = COLOR_HEX_MAP[project.color];

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Project title */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline/20">
          <h2 className="text-base font-semibold text-on-surface truncate">{project.name}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 shrink-0 text-on-surface-variant active:opacity-70 transition-opacity duration-100 px-1"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-outline/20 mx-4 mt-2 shrink-0">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'todo' && (
            <TodoList projectId={project.id} colorHex={colorHex} />
          )}

          {tab === 'notes' && (
            <>
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

              {sessionNotes.length > 0 ? (
                <div className="relative px-4 py-4">
                  <div
                    className="absolute inset-y-0 w-0.5"
                    style={{ left: '38px', backgroundColor: colorHex }}
                  />
                  <div className="flex flex-col gap-3">
                    {sessionNotes.map(s => {
                      const sessionNum = allProjectSessions.findIndex(sess => sess.id === s.id) + 1;
                      return (
                        <div key={s.id} className="flex items-start gap-3">
                          <div
                            className="relative z-10 shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white"
                            style={{ backgroundColor: colorHex, fontSize: sessionNum >= 100 ? '11px' : '14px' }}
                          >
                            {sessionNum}
                          </div>
                          <div className="flex-1 min-w-0">
                            <SwipeableSessionCard
                              onClick={() => { if (allowEdit) setEditingSession(s); }}
                              onDelete={() => { void deleteSession(s.id); setSwipeResetToken(k => k + 1); }}
                              resetToken={swipeResetToken}
                            >
                              <NoteCard session={s} onLightbox={setLightboxSrc} />
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
            </>
          )}
        </div>
      </div>

      {allowEdit && (
        <EditSessionSheet session={editingSession} onClose={() => setEditingSession(null)} />
      )}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  );
}
