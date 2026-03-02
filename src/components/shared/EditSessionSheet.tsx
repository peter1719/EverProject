import { useState, useRef } from 'react';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { OutcomeToggle } from './OutcomeToggle';
import { ProjectNameRow } from './ProjectNameRow';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
import { useSessionImage } from '@/hooks/useSessionImage';
import { compressImage } from '@/lib/imageUtils';
import { MAX_NOTES_LENGTH } from '@/lib/constants';
import type { Session, SessionOutcome } from '@/types';

export function EditSessionSheet({
  session,
  onClose,
  baseZIndex = 110,
}: {
  readonly session: Session | null;
  readonly onClose: () => void;
  readonly baseZIndex?: number;
}): React.ReactElement {
  return (
    <BottomSheet isOpen={!!session} onClose={onClose} title="Edit session" height="65dvh" baseZIndex={baseZIndex}>
      {session && <EditSessionForm key={session.id} session={session} onClose={onClose} />}
    </BottomSheet>
  );
}

function EditSessionForm({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}): React.ReactElement {
  const updateSession = useSessionStore(s => s.updateSession);
  const putSessionImage = useSessionStore(s => s.putSessionImage);
  const removeSessionImage = useSessionStore(s => s.removeSessionImage);
  const projects = useProjectStore(s => s.projects);
  const [outcome, setOutcome] = useState<SessionOutcome>(session.outcome);
  const [notes, setNotes] = useState(session.notes);
  const [hasImage, setHasImage] = useState(!!session.hasImage);
  const [newImageDataUrl, setNewImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const project = projects.find(p => p.id === session.projectId);

  // Lazily loaded from IDB; newImageDataUrl takes precedence if the user picked a replacement
  const existingImage = useSessionImage(session.id, !!session.hasImage);
  const displayImageDataUrl = newImageDataUrl ?? existingImage;

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setNewImageDataUrl(compressed);
      setHasImage(true);
    } catch { /* ignore */ }
    e.target.value = '';
  }

  async function handleSave(): Promise<void> {
    await updateSession(session.id, { outcome, notes, hasImage });
    if (hasImage && displayImageDataUrl) {
      await putSessionImage(session.id, displayImageDataUrl);
    } else if (!hasImage && session.hasImage) {
      await removeSessionImage(session.id);
    }
    onClose();
  }

  const dateLabel = new Date(session.startedAt)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Session identity */}
      <div className="flex items-center gap-2">
        <ProjectNameRow
          color={project?.color ?? session.projectColor}
          name={project?.name ?? session.projectName}
          className="flex-1"
        />
        <span className="text-xs text-on-surface-variant shrink-0">
          {dateLabel}
        </span>
      </div>

      {/* Outcome */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-on-surface-variant">Outcome</p>
        <OutcomeToggle value={outcome} onChange={setOutcome} includeAbandoned compactLabels />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-on-surface-variant">Notes</p>
          {!hasImage && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-on-primary-container bg-primary-container px-3 py-1 rounded-lg active:opacity-70 transition-opacity duration-100"
            >
              + Add photo
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => void handleImagePick(e)}
        />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
          placeholder="Add notes..."
          rows={3}
          className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
        />
        {hasImage && (
          <div className="relative rounded-xl overflow-hidden" style={{ width: 160, aspectRatio: '4/3' }}>
            {displayImageDataUrl
              ? <img src={displayImageDataUrl} alt="" className="w-full h-full object-cover object-center" />
              : <div className="w-full h-full bg-surface-variant animate-pulse" />
            }
            <button
              type="button"
              onClick={() => { setHasImage(false); setNewImageDataUrl(null); }}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white text-sm"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-2">
        <Button variant="filled" onClick={() => void handleSave()} className="flex-1">
          Save
        </Button>
        <Button variant="outlined" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
