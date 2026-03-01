import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorDot } from '@/components/shared/ColorDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { DurationSelector } from '@/components/shared/DurationSelector';
import { ProjectDetailSheet } from '@/components/shared';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { suggestProject, getDaysSinceLastSession } from '@/algorithms/suggestion';
import { COLOR_HEX_MAP } from '@/lib/constants';
import type { Project, TimerRouterState } from '@/types';

const DEFAULT_MINUTES = 45;

export function DailySuggestion(): React.ReactElement {
  const navigate = useNavigate();
  const [availableMinutes, setAvailableMinutes] = useState(DEFAULT_MINUTES);
  const [seed, setSeed] = useState(0);
  const [excludeId, setExcludeId] = useState<string | undefined>(undefined);
  const [flipping, setFlipping] = useState(false);
  const [noteSheetProject, setNoteSheetProject] = useState<Project | null>(null);
  const prevSuggestionRef = useRef<Project | null>(null);

  const sessions = useSessionStore(s => s.sessions);
  const getActiveProjects = useProjectStore(s => s.getActiveProjects);
  const activeProjects = getActiveProjects(sessions);

  const suggestion = useMemo(() => {
    return suggestProject({
      projects: activeProjects,
      sessions,
      availableMinutes,
      seed,
      excludeId,
    });
  }, [activeProjects, sessions, availableMinutes, seed, excludeId]);


  function handleRollAgain(): void {
    const currentId = suggestion?.id;
    setFlipping(true);
    setTimeout(() => {
      setExcludeId(currentId);
      setSeed(s => s + 1);
      setFlipping(false);
    }, 300);
  }

  function handleStartTimer(): void {
    const project = suggestion;
    if (!project) return;
    const state: TimerRouterState = {
      projectIds: [project.id],
      totalMinutes: availableMinutes,
    };
    navigate('/timer', { state });
  }

  function handleCombo(): void {
    navigate(`/combo?minutes=${availableMinutes}`);
  }

  const hasNoProjects = activeProjects.length === 0;

  const daysSince = suggestion
    ? getDaysSinceLastSession(suggestion.id, sessions)
    : null;

  useEffect(() => {
    if (!flipping && suggestion) {
      prevSuggestionRef.current = suggestion;
    }
  }, [flipping, suggestion]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="What's next?" />

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {/* Time selector */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-on-surface-variant">How much time do you have?</p>
          <DurationSelector value={availableMinutes} onChange={setAvailableMinutes} />
        </div>

        {/* Empty state: no projects */}
        {hasNoProjects && (
          <EmptyState
            title="No projects in library."
            subtitle="Add a project first."
          />
        )}


        {/* Suggestion card */}
        {suggestion && (
          <div
            style={{
              opacity: flipping ? 0 : 1,
              transform: flipping ? 'translateY(4px)' : 'translateY(0)',
              transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
            }}
          >
            <SuggestionCard
              project={suggestion}
              daysSince={daysSince}
              availableMinutes={availableMinutes}
              onClick={() => setNoteSheetProject(suggestion)}
            />
          </div>
        )}

        {/* Actions */}
        {!hasNoProjects && (
          <div className="flex flex-col gap-3 mx-4">
            <Button
              variant="outlined"
              onClick={handleRollAgain}
              disabled={activeProjects.length <= 1}
              className="w-full"
            >
              ↻ Roll again
            </Button>

            <Button
              variant="filled"
              onClick={handleStartTimer}
              disabled={!suggestion}
              className="w-full"
            >
              ▶ Start Timer
            </Button>

            <Button variant="tonal" onClick={handleCombo} className="w-full">
              Try Combo →
            </Button>
          </div>
        )}
      </div>

      <ProjectDetailSheet
        project={noteSheetProject}
        onClose={() => setNoteSheetProject(null)}
        allowEdit={false}
      />
    </div>
  );
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

interface SuggestionCardProps {
  readonly project: Project;
  readonly daysSince: number | null;
  readonly availableMinutes: number;
  readonly onClick: () => void;
}

function SuggestionCard({
  project,
  daysSince,
  availableMinutes,
  onClick,
}: SuggestionCardProps): React.ReactElement {
  const notesExcerpt = project.notes ? project.notes.slice(0, 80) : null;
  const colorHex = COLOR_HEX_MAP[project.color];

  const recencyLabel =
    daysSince === null
      ? 'Never done'
      : daysSince < 1
        ? 'Today'
        : daysSince < 2
          ? 'Yesterday'
          : `${Math.floor(daysSince)} days ago`;

  // When available time is very long (>200 min), show time remaining after the project
  // instead of the project duration — more useful when planning a long block.
  const durationTag =
    availableMinutes > 200
      ? `>3h left`
      : project.estimatedDurationMinutes >= 999
        ? '>3h'
        : `~${project.estimatedDurationMinutes} min`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="bg-surface-variant rounded-xl shadow-sm overflow-hidden cursor-pointer active:opacity-80 transition-opacity duration-100"
      style={{ borderLeft: `4px solid ${colorHex}` }}
    >
      {/* Project name row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <ColorDot color={project.color} size={14} />
        <span className="font-display text-lg font-bold text-on-surface flex-1 truncate">
          {project.name}
        </span>
      </div>

      {/* Duration tag + Note — always same height */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <span className="shrink-0 rounded-full bg-primary-container text-on-primary-container text-xs font-medium px-2.5 py-0.5">
          {durationTag}
        </span>
        <p className="text-sm text-on-surface-variant flex-1 min-w-0 leading-snug line-clamp-2">
          {notesExcerpt
            ? `${notesExcerpt}${project.notes.length > 80 ? '…' : ''}`
            : <span className="italic opacity-50">No note</span>}
        </p>
      </div>

      {/* Last done — bottom */}
      <div className="border-t border-outline/20 px-4 py-2">
        <span className="text-xs text-on-surface-variant">Last: {recencyLabel}</span>
      </div>
    </div>
  );
}
