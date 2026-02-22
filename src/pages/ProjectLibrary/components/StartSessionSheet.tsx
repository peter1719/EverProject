import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { ColorDot } from '@/components/shared/ColorDot';
import { cn } from '@/lib/utils';
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
  const [selectedMinutes, setSelectedMinutes] = useState<number>(
    project?.estimatedDurationMinutes ?? 30,
  );

  const effectiveMinutes = project
    ? (DURATION_OPTIONS.includes(selectedMinutes as (typeof DURATION_OPTIONS)[number])
        ? selectedMinutes
        : project.estimatedDurationMinutes)
    : 30;

  function handleStart(): void {
    if (!project) return;
    navigate('/timer', {
      state: { projectIds: [project.id], totalMinutes: effectiveMinutes },
    });
    onClose();
  }

  function handleUnarchive(): void {
    if (!project || !onUnarchive) return;
    onUnarchive(project.id);
    onClose();
  }

  function handleOpenChange(mins: number): void {
    setSelectedMinutes(mins);
  }

  return (
    <BottomSheet isOpen={!!project} onClose={onClose} title="Start session?">
      {project && (
        <div className="flex flex-col gap-5 p-4">
          {/* Project identity */}
          <div className="flex items-center gap-3">
            <ColorDot color={project.color} size={16} />
            <span className="text-base font-medium text-on-surface flex-1 truncate">
              {project.name}
            </span>
          </div>

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
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleOpenChange(mins)}
                  className={cn(
                    'h-14 w-full rounded-lg text-sm font-medium active:opacity-80 transition-opacity duration-100',
                    effectiveMinutes === mins
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline text-on-surface-variant bg-transparent',
                  )}
                >
                  {mins >= 999 ? '>180' : mins}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-2">
            <button
              onClick={handleStart}
              className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100"
            >
              ▶ Start
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-lg border border-outline text-on-surface-variant bg-transparent font-medium active:opacity-80 transition-opacity duration-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
