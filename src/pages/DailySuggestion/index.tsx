import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { DurationSelector } from '@/components/shared/DurationSelector';
import { ProjectDetailSheet } from '@/components/shared';
import { ProjectProgressBar } from '@/components/shared/ProjectProgressBar';
import { ColorFilterDropdown } from '@/pages/ProjectLibrary/components/ColorFilterDropdown';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStyle } from '@/hooks/useAppStyle';
import { suggestProject, getDaysSinceLastSession } from '@/algorithms/suggestion';
import { COLOR_HEX_MAP, COLOR_PALETTE } from '@/lib/constants';
import type { Project, ProjectColor, TimerRouterState } from '@/types';

const DEFAULT_MINUTES = 45;

export function DailySuggestion(): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [availableMinutes, setAvailableMinutes] = useState(DEFAULT_MINUTES);
  const [seed, setSeed] = useState(0);
  const [excludeId, setExcludeId] = useState<string | undefined>(undefined);
  const [flipping, setFlipping] = useState(false);
  const [noteSheetProject, setNoteSheetProject] = useState<Project | null>(null);
  const [colorFilter, setColorFilter] = useState<ProjectColor | null>(null);
  const prevSuggestionRef = useRef<Project | null>(null);

  const sessions = useSessionStore(s => s.sessions);
  const getActiveProjects = useProjectStore(s => s.getActiveProjects);
  const activeProjects = getActiveProjects(sessions);

  const usedColors = useMemo(
    () => COLOR_PALETTE.filter(c => activeProjects.some(p => p.color === c)),
    [activeProjects],
  );

  const filteredProjects = useMemo(
    () => colorFilter ? activeProjects.filter(p => p.color === colorFilter) : activeProjects,
    [activeProjects, colorFilter],
  );

  const suggestion = useMemo(() => {
    return suggestProject({
      projects: filteredProjects,
      sessions,
      availableMinutes,
      seed,
      excludeId,
    });
  }, [filteredProjects, sessions, availableMinutes, seed, excludeId]);

  function handleColorFilterChange(color: ProjectColor | null): void {
    setColorFilter(color);
    setSeed(0);
    setExcludeId(undefined);
  }

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
      origin: '/suggest',
    };
    navigate('/timer', { state });
  }

  function handleCombo(): void {
    navigate(`/combo?minutes=${availableMinutes}`);
  }

  const hasNoProjects = activeProjects.length === 0;
  const hasNoFiltered = filteredProjects.length === 0 && !hasNoProjects;

  const daysSince = suggestion
    ? getDaysSinceLastSession(suggestion.id, sessions)
    : null;

  const suggestionTotalMinutes = useMemo(() => {
    if (!suggestion) return 0;
    return sessions
      .filter(s => s.projectId === suggestion.id && s.outcome !== 'abandoned')
      .reduce((sum, s) => sum + s.actualDurationMinutes, 0);
  }, [suggestion, sessions]);

  useEffect(() => {
    if (!flipping && suggestion) {
      prevSuggestionRef.current = suggestion;
    }
  }, [flipping, suggestion]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('page.suggest')} />

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-6">
        {/* Time selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-on-surface-variant">{t('suggest.timeQuestion')}</p>
            <div className="relative">
              <ColorFilterDropdown
                colors={usedColors}
                value={colorFilter}
                onChange={handleColorFilterChange}
              />
            </div>
          </div>
          <DurationSelector value={availableMinutes} onChange={setAvailableMinutes} />
        </div>

        {/* Empty state: no projects */}
        {hasNoProjects && (
          <EmptyState
            title={t('suggest.noProjects')}
            subtitle={t('suggest.noProjectsSub')}
          />
        )}

        {/* Empty state: no projects match filter */}
        {hasNoFiltered && (
          <EmptyState
            title={t('suggest.noProjectsFilter')}
            subtitle={t('suggest.noProjectsFilterSub')}
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
              totalMinutes={suggestionTotalMinutes}
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
              disabled={filteredProjects.length <= 1}
              className="w-full"
            >
              {t('suggest.rollAgain')}
            </Button>

            <Button
              variant="filled"
              onClick={handleStartTimer}
              disabled={!suggestion}
              className="w-full"
            >
              {t('suggest.startTimer')}
            </Button>

            <Button variant="tonal" onClick={handleCombo} className="w-full">
              {t('suggest.tryCombo')}
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
  readonly totalMinutes: number;
  readonly onClick: () => void;
}

function SuggestionCard({
  project,
  daysSince,
  totalMinutes,
  onClick,
}: SuggestionCardProps): React.ReactElement {
  const { t } = useTranslation();
  const appStyle = useAppStyle();
  const notesExcerpt = project.notes ? project.notes.slice(0, 80) : null;
  const colorHex = COLOR_HEX_MAP[project.color];

  const recencyLabel =
    daysSince === null
      ? t('suggest.neverDone')
      : daysSince < 1
        ? t('suggest.today')
        : daysSince < 2
          ? t('suggest.yesterday')
          : t('suggest.daysAgo', { n: Math.floor(daysSince) });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="bg-surface-variant rounded-xl shadow-sm overflow-hidden cursor-pointer active:opacity-80 transition-opacity duration-100"
      style={appStyle === 'paper'
        ? { borderTop: `6px solid ${colorHex}` }
        : { borderLeft: `4px solid ${colorHex}` }
      }
    >
      {/* Project name row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <span className="font-display text-lg font-bold text-on-surface flex-1 truncate">
          {project.name}
        </span>
      </div>

      {/* Note */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <p className="text-sm text-on-surface-variant flex-1 min-w-0 leading-snug line-clamp-2">
          {notesExcerpt
            ? `${notesExcerpt}${project.notes.length > 80 ? '…' : ''}`
            : <span className="opacity-50">{t('suggest.noNote')}</span>}
        </p>
      </div>

      {/* Last done — bottom */}
      <div className="border-t border-outline/20 px-4 py-2">
        <span className="text-xs text-on-surface-variant">{t('suggest.last', { label: recencyLabel })}</span>
      </div>

      {/* Progress bar */}
      <ProjectProgressBar
        totalMinutes={totalMinutes}
        estimatedDurationMinutes={project.estimatedDurationMinutes}
        colorHex={colorHex}
        className="border-t border-outline/20 py-3"
      />
    </div>
  );
}
