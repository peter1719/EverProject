import { useState } from 'react';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { OutcomeToggle } from './OutcomeToggle';
import { ProjectNameRow } from './ProjectNameRow';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
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
  const projects = useProjectStore(s => s.projects);
  const [outcome, setOutcome] = useState<SessionOutcome>(session.outcome);
  const [notes, setNotes] = useState(session.notes);
  const project = projects.find(p => p.id === session.projectId);

  async function handleSave(): Promise<void> {
    await updateSession(session.id, { outcome, notes });
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
        <p className="text-sm font-medium text-on-surface-variant">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
          placeholder="Add notes..."
          rows={3}
          className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
        />
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
