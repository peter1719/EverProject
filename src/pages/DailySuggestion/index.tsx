import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorDot } from '@/components/shared/ColorDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { suggestProject, getDurationFitScore, getDaysSinceLastSession } from '@/algorithms/suggestion';
import { DURATION_OPTIONS, COLOR_HEX_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Project, TimerRouterState } from '@/types';

const DEFAULT_MINUTES = 45;

export function DailySuggestion(): React.ReactElement {
  const navigate = useNavigate();
  const [availableMinutes, setAvailableMinutes] = useState(DEFAULT_MINUTES);
  const [seed, setSeed] = useState(0);
  const [flipping, setFlipping] = useState(false);
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
    });
  }, [activeProjects, sessions, availableMinutes, seed]);

  const eligibleCount = useMemo(() => {
    return activeProjects.filter(p => p.estimatedDurationMinutes <= availableMinutes).length;
  }, [activeProjects, availableMinutes]);

  function handleRollAgain(): void {
    setFlipping(true);
    setTimeout(() => {
      setSeed(s => s + 1);
      setFlipping(false);
    }, 300);
  }

  function handleStartTimer(): void {
    if (!suggestion) return;
    const state: TimerRouterState = {
      projectIds: [suggestion.id],
      totalMinutes: availableMinutes,
    };
    navigate('/timer', { state });
  }

  function handleCombo(): void {
    navigate(`/combo?minutes=${availableMinutes}`);
  }

  const hasNoProjects = activeProjects.length === 0;
  const noFit = !hasNoProjects && !suggestion;

  const fitScore = suggestion
    ? getDurationFitScore(suggestion.estimatedDurationMinutes, availableMinutes)
    : 0;
  const daysSince = suggestion ? getDaysSinceLastSession(suggestion.id, sessions) : null;

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
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => setAvailableMinutes(mins)}
                className={cn(
                  'h-14 w-full rounded-xl font-mono text-sm font-medium active:opacity-80 transition-opacity duration-100',
                  availableMinutes === mins
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline text-on-surface-variant bg-transparent',
                )}
              >
                {mins >= 999 ? '>180' : mins}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state: no projects */}
        {hasNoProjects && (
          <EmptyState
            title="No projects in library."
            subtitle="Add a project first."
          />
        )}

        {/* No fit state */}
        {noFit && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-base text-on-surface text-center">
              Nothing fits {availableMinutes} min.
            </p>
            <p className="text-sm text-on-surface-variant text-center">
              Try a longer time.
            </p>
          </div>
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
              fitScore={fitScore}
              daysSince={daysSince}
              availableMinutes={availableMinutes}
            />
          </div>
        )}

        {/* Actions */}
        {!hasNoProjects && (
          <div className="flex flex-col gap-3 mx-4">
            {/* Roll Again */}
            <button
              onClick={handleRollAgain}
              disabled={eligibleCount <= 1 || !suggestion}
              className={cn(
                'w-full h-12 rounded-xl border border-outline text-on-surface-variant bg-transparent font-medium',
                eligibleCount > 1 && suggestion
                  ? 'active:opacity-80 transition-opacity duration-100'
                  : 'opacity-[0.38] cursor-not-allowed',
              )}
            >
              ↻ Roll again
            </button>

            {/* Start Timer */}
            <button
              onClick={handleStartTimer}
              disabled={!suggestion}
              className={cn(
                'w-full h-12 rounded-xl font-medium',
                suggestion
                  ? 'bg-primary text-on-primary active:opacity-80 transition-opacity duration-100'
                  : 'bg-outline/20 text-on-surface-variant opacity-[0.38] cursor-not-allowed',
              )}
            >
              ▶ Start Timer
            </button>

            {/* Try Combo */}
            <button
              onClick={handleCombo}
              className="w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-medium active:opacity-80 transition-opacity duration-100"
            >
              Try Combo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

interface SuggestionCardProps {
  readonly project: Project;
  readonly fitScore: number;
  readonly daysSince: number | null;
  readonly availableMinutes: number;
}

function SuggestionCard({
  project,
  fitScore,
  daysSince,
  availableMinutes,
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

  const slackMin = availableMinutes - project.estimatedDurationMinutes;
  const slackLabel =
    availableMinutes >= 999
      ? 'Plenty of time'
      : slackMin === 0
        ? 'Perfect fit'
        : `${slackMin} min free`;

  return (
    <div
      className="bg-surface-variant rounded-xl shadow-sm overflow-hidden"
      style={{ borderLeft: `4px solid ${colorHex}` }}
    >
      {/* Project name row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <ColorDot color={project.color} size={14} />
        <span className="font-display text-lg font-bold text-on-surface flex-1 truncate">
          {project.name}
        </span>
      </div>

      {/* Duration + fit bar */}
      <div className="flex items-center gap-3 px-4 pb-2">
        <span className="font-mono text-sm text-on-surface-variant shrink-0">
          {project.estimatedDurationMinutes >= 999 ? '>3h' : `~${project.estimatedDurationMinutes} MIN`}
        </span>
        <div className="flex-1 h-1 rounded-full bg-outline/20">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(fitScore * 100)}%`,
              backgroundColor: colorHex,
            }}
          />
        </div>
        <span className="text-sm text-on-surface-variant shrink-0">
          {slackLabel}
        </span>
      </div>

      {/* Recency */}
      <div className="px-4 pb-2">
        <span className="text-sm text-on-surface-variant">
          Last: {recencyLabel}
        </span>
      </div>

      {/* Notes */}
      {notesExcerpt && (
        <div className="px-4 pb-4 border-t border-outline/20 pt-2">
          <p className="text-sm text-on-surface-variant leading-snug italic">
            "{notesExcerpt}{project.notes.length > 80 ? '…' : ''}"
          </p>
        </div>
      )}
    </div>
  );
}
