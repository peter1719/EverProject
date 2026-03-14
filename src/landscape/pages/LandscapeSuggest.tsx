import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { DurationSelector } from '@/components/shared/DurationSelector';
import { ProjectDetailPanel } from '@/components/shared/ProjectDetailPanel';
import { ProjectProgressBar } from '@/components/shared/ProjectProgressBar';
import { ColorFilterDropdown } from '@/pages/ProjectLibrary/components/ColorFilterDropdown';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStyle } from '@/hooks/useAppStyle';
import { suggestProject, getDaysSinceLastSession } from '@/algorithms/suggestion';
import { COLOR_HEX_MAP, COLOR_PALETTE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Project, ProjectColor, TimerRouterState } from '@/types';

const DEFAULT_MINUTES = 45;

// ── SuggestionCard (reused from portrait) ────────────────────────────────────

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
  const notesExcerpt = project.notes ? project.notes.slice(0, 120) : null;
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
      style={appStyle === 'pixel-gemini' ? { boxShadow: `4px 4px 0px 0px ${colorHex}`, margin: '0 4px 4px 0' } : {}}
      className={appStyle === 'pixel-gemini' ? "rounded-none" : ""}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        className={cn(
          "bg-surface-variant overflow-hidden cursor-pointer active:opacity-80 transition-opacity duration-100",
          appStyle === 'pixel-gemini' ? "border-2 border-outline rounded-none" : "rounded-xl shadow-sm"
        )}
        style={{
          ...(appStyle !== 'pixel-gemini' ? { borderLeft: `4px solid ${colorHex}` } : {})
        }}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <span className="font-display text-xl font-bold text-on-surface flex-1 truncate">
            {project.name}
          </span>
        </div>
        <div className="px-4 pb-3">
          <p className="text-sm text-on-surface-variant leading-snug line-clamp-3">
            {notesExcerpt
              ? `${notesExcerpt}${project.notes.length > 120 ? '…' : ''}`
              : <span className="opacity-50">{t('suggest.noNote')}</span>}
          </p>
        </div>
        <div className="border-t border-outline/20 px-4 py-2">
          <span className="text-xs text-on-surface-variant">{t('suggest.last', { label: recencyLabel })}</span>
        </div>
        <ProjectProgressBar
          totalMinutes={totalMinutes}
          projectDurationMinutes={project.projectDurationMinutes}
          colorHex={colorHex}
          className="border-t border-outline/20 py-3"
        />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function LandscapeSuggest(): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [availableMinutes, setAvailableMinutes] = useState(DEFAULT_MINUTES);
  const [seed, setSeed] = useState(0);
  const [excludeId, setExcludeId] = useState<string | undefined>(undefined);
  const [flipping, setFlipping] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
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
    return suggestProject({ projects: filteredProjects, sessions, availableMinutes, seed, excludeId });
  }, [filteredProjects, sessions, availableMinutes, seed, excludeId]);

  const daysSince = suggestion ? getDaysSinceLastSession(suggestion.id, sessions) : null;

  const suggestionTotalMinutes = useMemo(() => {
    if (!suggestion) return 0;
    return sessions
      .filter(s => s.projectId === suggestion.id && s.outcome !== 'abandoned')
      .reduce((sum, s) => sum + s.actualDurationMinutes, 0);
  }, [suggestion, sessions]);

  useEffect(() => {
    if (!flipping && suggestion) prevSuggestionRef.current = suggestion;
  }, [flipping, suggestion]);

  function handleColorFilterChange(color: ProjectColor | null): void {
    setColorFilter(color);
    setSeed(0);
    setExcludeId(undefined);
  }

  function handleRollAgain(): void {
    const currentId = suggestion?.id;
    setShowDetail(false);
    setFlipping(true);
    setTimeout(() => {
      setExcludeId(currentId);
      setSeed(s => s + 1);
      setFlipping(false);
    }, 300);
  }

  function handleStartTimer(): void {
    if (!suggestion) return;
    const state: TimerRouterState = {
      projectIds: [suggestion.id],
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

  return (
    <div className="flex h-full">
      {/* ── Left: duration selector + suggestion card ─────────────────── */}
      <div className="flex w-[58%] flex-col border-r border-outline/20 overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline/20">
          <h1 className="text-lg font-semibold text-on-surface">{t('page.suggest')}</h1>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-5">
          {/* Duration selector + color filter */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-on-surface-variant">{t('suggest.timeQuestion')}</p>
              <ColorFilterDropdown
                colors={usedColors}
                value={colorFilter}
                onChange={handleColorFilterChange}
              />
            </div>
            <DurationSelector value={availableMinutes} onChange={setAvailableMinutes} />
          </div>

          {/* Empty states */}
          {hasNoProjects && (
            <EmptyState title={t('suggest.noProjects')} subtitle={t('suggest.noProjectsSub')} />
          )}
          {hasNoFiltered && (
            <EmptyState title={t('suggest.noProjectsFilter')} subtitle={t('suggest.noProjectsFilterSub')} />
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
                onClick={() => setShowDetail(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Right: detail panel or actions ───────────────────────────── */}
      {showDetail && suggestion ? (
        <div className="flex flex-1 flex-col overflow-hidden border-l border-outline/20">
          <ProjectDetailPanel
            project={suggestion}
            allowEdit={false}
            onClose={() => setShowDetail(false)}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-stretch justify-center gap-4 px-8">
          {!hasNoProjects && (
            <>
              <Button
                variant="filled"
                onClick={handleStartTimer}
                disabled={!suggestion}
                className="w-full"
              >
                {t('suggest.startTimer')}
              </Button>

              <Button
                variant="outlined"
                onClick={handleRollAgain}
                disabled={filteredProjects.length <= 1}
                className="w-full"
              >
                {t('suggest.rollAgain')}
              </Button>

              <Button variant="tonal" onClick={handleCombo} className="w-full">
                {t('suggest.tryCombo')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
