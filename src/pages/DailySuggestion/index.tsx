/**
 * Daily Suggestion page (/suggest, Tab 2).
 * DrumPicker to choose available time; calls suggestProject() for a weighted random pick.
 * Stacked-card swipe: bottom card peeks at scale(0.95), top card exits on swipe.
 * Dependencies: projectStore, sessionStore, suggestProject, useNavigate, useSwipeGesture
 */
import { useState, useMemo, useCallback } from 'react';
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
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { suggestProject, getDaysSinceLastSession } from '@/algorithms/suggestion';
import { COLOR_HEX_MAP, COLOR_PALETTE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Project, ProjectColor, TimerRouterState } from '@/types';

const DEFAULT_MINUTES = 45;

export function DailySuggestion(): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [availableMinutes, setAvailableMinutes] = useState(DEFAULT_MINUTES);
  const [seed, setSeed] = useState(0);
  const [excludeId, setExcludeId] = useState<string | undefined>(undefined);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('left');
  const [noteSheetProject, setNoteSheetProject] = useState<Project | null>(null);
  const [colorFilter, setColorFilter] = useState<ProjectColor | null>(null);

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

  const suggestion = useMemo(
    () => suggestProject({ projects: filteredProjects, sessions, availableMinutes, seed, excludeId }),
    [filteredProjects, sessions, availableMinutes, seed, excludeId],
  );

  // Pre-compute the peek (bottom) card — always the next result after current
  const peekSuggestion = useMemo(() => {
    if (filteredProjects.length <= 1 || !suggestion) return null;
    return suggestProject({
      projects: filteredProjects,
      sessions,
      availableMinutes,
      seed: seed + 1,
      excludeId: suggestion.id,
    });
  }, [filteredProjects, sessions, availableMinutes, seed, suggestion]);

  function handleColorFilterChange(color: ProjectColor | null): void {
    setColorFilter(color);
    setSeed(0);
    setExcludeId(undefined);
  }

  const triggerRoll = useCallback((dir: 'left' | 'right'): void => {
    if (filteredProjects.length <= 1) return;
    const currentId = suggestion?.id;
    setExitDir(dir);
    setIsExiting(true);
    setTimeout(() => {
      setExcludeId(currentId);
      setSeed(s => s + 1);
      setIsExiting(false);
    }, 320);
  }, [filteredProjects.length, suggestion?.id]);

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

  const { dragX, isDragging, isSnapping, ...swipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => triggerRoll('left'),
    onSwipeRight: () => triggerRoll('right'),
    disabled: filteredProjects.length <= 1 || isExiting,
  });

  // Real-time drag transform — rotation follows finger (upper arc: left = CCW, right = CW)
  const dragRotation = Math.min(Math.max(dragX * 0.04, -10), 10);
  const cardTransform = isExiting
    ? `translateX(${exitDir === 'left' ? '-110%' : '110%'}) rotate(${exitDir === 'left' ? '-8deg' : '8deg'})`
    : `translateX(${dragX}px) rotate(${dragRotation}deg)`;
  // isSnapping: snap-back after sub-threshold release. NOT set on commit → no reverse slide-in.
  const cardTransition = isExiting
    ? 'transform 320ms ease-out'
    : isSnapping ? 'transform 250ms ease-out' : 'none';

  const hasNoProjects = activeProjects.length === 0;
  const hasNoFiltered = filteredProjects.length === 0 && !hasNoProjects;

  const daysSince = suggestion ? getDaysSinceLastSession(suggestion.id, sessions) : null;

  const suggestionTotalMinutes = useMemo(() => {
    if (!suggestion) return 0;
    return sessions
      .filter(s => s.projectId === suggestion.id && s.outcome !== 'abandoned')
      .reduce((sum, s) => sum + s.actualDurationMinutes, 0);
  }, [suggestion, sessions]);

  const suggestionSessionCount = useMemo(() => {
    if (!suggestion) return 0;
    return sessions.filter(s => s.projectId === suggestion.id && s.outcome !== 'abandoned').length;
  }, [suggestion, sessions]);

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

        {hasNoProjects && (
          <EmptyState title={t('suggest.noProjects')} subtitle={t('suggest.noProjectsSub')} />
        )}
        {hasNoFiltered && (
          <EmptyState title={t('suggest.noProjectsFilter')} subtitle={t('suggest.noProjectsFilterSub')} />
        )}

        {/* Stacked card */}
        {suggestion && (
          <div>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Bottom card — full size, waits behind top card */}
              {peekSuggestion && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                  }}
                >
                  <SuggestionCard
                    project={peekSuggestion}
                    daysSince={null}
                    totalMinutes={0}
                    sessionCount={0}
                    onClick={() => {}}
                  />
                </div>
              )}

              {/* Top card — follows finger, flies off on commit */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  transform: cardTransform,
                  transition: cardTransition,
                  touchAction: 'pan-y',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                {...swipeHandlers}
              >
                <SuggestionCard
                  project={suggestion}
                  daysSince={daysSince}
                  totalMinutes={suggestionTotalMinutes}
                  sessionCount={suggestionSessionCount}
                  onClick={() => setNoteSheetProject(suggestion)}
                />
              </div>
            </div>

            <p className="text-center text-xs text-on-surface-variant/50 mt-2 select-none">
              {filteredProjects.length > 1
                ? t('suggest.swipeHint')
                : colorFilter
                  ? t('suggest.onlyOneInColor')
                  : t('suggest.onlyOneProject')}
            </p>
          </div>
        )}

        {/* Actions */}
        {!hasNoProjects && (
          <div className="flex flex-col gap-3 mx-4">
            <Button variant="filled" onClick={handleStartTimer} disabled={!suggestion} className="w-full">
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
  readonly sessionCount: number;
  readonly onClick: () => void;
}

function SuggestionCard({
  project,
  daysSince,
  totalMinutes,
  sessionCount,
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
          ...(appStyle === 'paper' ? { borderTop: `6px solid ${colorHex}` } : {}),
          ...(appStyle !== 'paper' && appStyle !== 'pixel-gemini' ? { borderLeft: `4px solid ${colorHex}` } : {})
        }}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <span className="font-display text-lg font-bold text-on-surface flex-1 truncate">
            {project.name}
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <p className="text-sm text-on-surface-variant flex-1 min-w-0 leading-snug line-clamp-2">
            {notesExcerpt
              ? `${notesExcerpt}${project.notes.length > 80 ? '…' : ''}`
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
          sessionCount={sessionCount}
          className="border-t border-outline/20 py-3"
        />
      </div>
    </div>
  );
}
