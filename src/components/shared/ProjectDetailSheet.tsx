import { useSessionStore } from '@/store/sessionStore';
import { COLOR_HEX_MAP } from '@/lib/constants';
import { BottomSheet } from './BottomSheet';
import type { Project } from '@/types';

interface ProjectDetailSheetProps {
  readonly project: Project | null;
  readonly onClose: () => void;
}

function formatNoteDate(timestamp: number): string {
  const d = new Date(timestamp);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function ProjectDetailSheet({ project, onClose }: ProjectDetailSheetProps): React.ReactElement {
  const sessions = useSessionStore(s => s.sessions);

  const sessionNotes = project
    ? sessions
        .filter(s => s.projectId === project.id && s.notes.trim() !== '')
        .sort((a, b) => b.startedAt - a.startedAt)
    : [];

  const allProjectSessions = project
    ? sessions
        .filter(s => s.projectId === project.id)
        .sort((a, b) => a.startedAt - b.startedAt)
    : [];

  const colorHex = project ? COLOR_HEX_MAP[project.color] : '';

  return (
    <BottomSheet isOpen={!!project} onClose={onClose} title={project?.name ?? ''} height="70dvh">
      {!!project && (
        <div className="flex flex-col">
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
                      {/* Colored badge — sits on top of the timeline line */}
                      <div
                        className="relative z-10 shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white"
                        style={{
                          backgroundColor: colorHex,
                          fontSize: sessionNum >= 100 ? '11px' : '14px',
                        }}
                      >
                        {sessionNum}
                      </div>

                      {/* Note card */}
                      <div className="flex-1 min-w-0 bg-surface-variant rounded-xl px-4 py-3">
                        <p className="text-sm text-on-surface leading-snug">{s.notes}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-on-surface-variant">
                            {formatNoteDate(s.startedAt)}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {s.actualDurationMinutes} min
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant/50 italic text-center py-8 px-4">
              {project.notes ? 'No session notes yet.' : 'No notes yet.'}
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
