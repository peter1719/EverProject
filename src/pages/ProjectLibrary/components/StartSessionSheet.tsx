import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { Button } from '@/components/shared/Button';
import { DurationSelector } from '@/components/shared/DurationSelector';
import { ProjectNameRow } from '@/components/shared/ProjectNameRow';
import { DURATION_OPTIONS } from '@/lib/constants';
import type { Project } from '@/types';

interface StartSessionSheetProps {
  readonly project: Project | null;
  readonly onClose: () => void;
  readonly onUnarchive?: (id: string) => void;
}

export function StartSessionSheet({
  project,
  onClose,
  onUnarchive,
}: StartSessionSheetProps): React.ReactElement {
  const navigate = useNavigate();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);

  const effectiveMinutes = DURATION_OPTIONS.includes(
    selectedMinutes as (typeof DURATION_OPTIONS)[number],
  )
    ? selectedMinutes
    : 30;

  function handleStart(): void {
    if (!project) return;
    navigate('/timer', {
      state: { projectIds: [project.id], totalMinutes: effectiveMinutes, origin: '/library' },
    });
    onClose();
  }

  function handleUnarchive(): void {
    if (!project || !onUnarchive) return;
    onUnarchive(project.id);
    onClose();
  }

  return (
    <BottomSheet isOpen={!!project} onClose={onClose} title="Start session?" height="60dvh">
      {project && (
        <div className="flex flex-col gap-5 p-4">
          {/* Project identity */}
          <ProjectNameRow
            color={project.color}
            name={project.name}
            dotSize={16}
            gap={3}
            textSize="base"
          />

          {/* Archived banner */}
          {project.isArchived && (
            <div className="flex items-center justify-between rounded-xl bg-primary-container px-3 py-2">
              <span className="text-sm font-medium text-on-primary-container">Archived</span>
              {onUnarchive && (
                <button
                  onClick={handleUnarchive}
                  className="h-8 px-3 rounded-lg bg-primary text-on-primary text-sm font-medium active:opacity-80 transition-opacity duration-100"
                >
                  Unarchive
                </button>
              )}
            </div>
          )}

          {/* Duration picker */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-on-surface-variant">How long?</label>
            <DurationSelector value={effectiveMinutes} onChange={setSelectedMinutes} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-2">
            <Button variant="filled" onClick={handleStart} className="flex-1">
              ▶ Start
            </Button>
            <Button variant="outlined" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
