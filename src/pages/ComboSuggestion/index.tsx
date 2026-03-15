/**
 * Combo Suggestion page (/combo?minutes=N).
 * Reads minutes from URL param; calls suggestCombos() for up to 3 multi-project sets.
 * Stacked-card swipe: bottom card peeks at scale(0.95), top card exits on swipe.
 * Dependencies: projectStore, sessionStore, suggestCombos, useSearchParams, useSwipeGesture
 */
import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorDot } from '@/components/shared/ColorDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { ProjectColorStrip } from '@/components/shared/ProjectColorStrip';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { DurationSelector } from '@/components/shared/DurationSelector';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStyle } from '@/hooks/useAppStyle';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { suggestCombos } from '@/algorithms/combo';
import { cn } from '@/lib/utils';
import type { ComboSuggestion, TimerRouterState } from '@/types';

export function ComboSuggestion(): React.ReactElement {
  const [params] = useSearchParams();
  const minutes = Number(params.get('minutes'));

  if (!minutes || isNaN(minutes) || minutes <= 0) {
    return <Navigate to="/suggest" replace />;
  }

  return <ComboSuggestionInner availableMinutes={minutes} />;
}

// ── Inner component (minutes validated) ──────────────────────────────────────

interface ComboSuggestionInnerProps {
  readonly availableMinutes: number;
}

function ComboSuggestionInner({ availableMinutes }: ComboSuggestionInnerProps): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('left');
  // peekIndex: which combo shows as the bottom card during & after animation
  const [peekIndex, setPeekIndex] = useState(0);

  const sessions = useSessionStore(s => s.sessions);
  const getActiveProjects = useProjectStore(s => s.getActiveProjects);
  const activeProjects = getActiveProjects(sessions);

  const combos = useMemo(
    () => suggestCombos({ projects: activeProjects, sessions, availableMinutes, seed: 0 }),
    [activeProjects, sessions, availableMinutes],
  );

  // At rest, peek shows the next combo (circular). During exit, it shows the target.
  const displayPeekIndex = isExiting
    ? peekIndex
    : (currentIndex + 1) % Math.max(combos.length, 1);

  const goTo = useCallback((targetIndex: number, dir: 'left' | 'right'): void => {
    if (combos.length <= 1) return;
    setPeekIndex(targetIndex);
    setExitDir(dir);
    setIsExiting(true);
    setTimeout(() => {
      setCurrentIndex(targetIndex);
      setIsExiting(false);
    }, 320);
  }, [combos.length]);

  function handleStart(): void {
    const combo = combos[currentIndex];
    if (!combo) return;
    const comboGroupId = crypto.randomUUID();
    const projectAllocatedMinutes: Record<string, number> = {};
    combo.projects.forEach((p, i) => { projectAllocatedMinutes[p.id] = combo.projectMinutes[i]; });
    const state: TimerRouterState = {
      projectIds: combo.projects.map(p => p.id),
      totalMinutes: availableMinutes,
      comboGroupId,
      projectAllocatedMinutes,
      origin: '/suggest',
    };
    navigate('/timer', { state });
  }

  function handleTimeChange(mins: number): void {
    setShowTimePicker(false);
    setCurrentIndex(0);
    navigate(`/combo?minutes=${mins}`, { replace: true });
  }

  const { dragX, isDragging, isSnapping, ...swipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => goTo((currentIndex + 1) % combos.length, 'left'),
    onSwipeRight: () => goTo((currentIndex - 1 + combos.length) % combos.length, 'right'),
    disabled: combos.length <= 1 || isExiting,
  });

  const dragRotation = Math.min(Math.max(dragX * 0.04, -10), 10);
  const cardTransform = isExiting
    ? `translateX(${exitDir === 'left' ? '-110%' : '110%'}) rotate(${exitDir === 'left' ? '-8deg' : '8deg'})`
    : `translateX(${dragX}px) rotate(${dragRotation}deg)`;
  const cardTransition = isExiting
    ? 'transform 320ms ease-out'
    : isSnapping ? 'transform 250ms ease-out' : 'none';

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t('page.combo')}
        showBack
        backPath="/suggest"
        rightSlot={
          <button
            onClick={() => setShowTimePicker(true)}
            className="flex items-center gap-1 mr-2 my-3 px-3 rounded-xl bg-surface-variant text-sm font-medium text-on-surface-variant active:opacity-80 transition-opacity duration-100"
          >
            {availableMinutes} min ▾
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-4 py-4">
        {combos.length === 0 && (
          <EmptyState
            title={t('combo.noCombo', { minutes: availableMinutes })}
            subtitle={t('combo.noComboSub')}
          />
        )}

        {combos.length > 0 && (
          <>
            {/* Stacked card */}
            <div className="px-4">
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Bottom card — full size, waits behind top card */}
                {combos.length > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                    }}
                  >
                    <ComboCard combo={combos[displayPeekIndex]} index={displayPeekIndex} total={combos.length} />
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
                  <ComboCard combo={combos[currentIndex]} index={currentIndex} total={combos.length} />
                </div>
              </div>
            </div>

            {/* Dot indicators + swipe hint */}
            {combos.length > 1 && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center gap-2">
                  {combos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (i === currentIndex) return;
                        goTo(i, i > currentIndex ? 'left' : 'right');
                      }}
                      aria-label={t('combo.dotAriaLabel', { index: i + 1 })}
                      className={cn(
                        'rounded-full w-2 h-2',
                        i === currentIndex ? 'bg-primary' : 'bg-outline/30',
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant/50 select-none">
                  {t('combo.swipeHint')}
                </p>
              </div>
            )}

            {/* Start button */}
            <div className="px-4">
              <Button variant="filled" onClick={handleStart} className="w-full">
                {t('combo.startThis')}
              </Button>
            </div>
          </>
        )}
      </div>

      <BottomSheet
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        title={t('combo.changeDuration')}
        height="45dvh"
      >
        <div className="px-4 py-4">
          <DurationSelector value={availableMinutes} onChange={handleTimeChange} />
        </div>
      </BottomSheet>
    </div>
  );
}

// ── ComboCard ─────────────────────────────────────────────────────────────────

interface ComboCardProps {
  readonly combo: ComboSuggestion;
  readonly index: number;
  readonly total: number;
}

function ComboCard({ combo, index, total }: ComboCardProps): React.ReactElement {
  const { t } = useTranslation();
  const appStyle = useAppStyle();
  const slackClass =
    combo.slackMinutes <= 5
      ? 'text-success'
      : combo.slackMinutes <= 15
        ? 'text-warning'
        : 'text-on-surface-variant';

  return (
    <div
      style={appStyle === 'pixel-gemini' ? { boxShadow: '4px 4px 0px 0px var(--outline)', margin: '0 4px 4px 0' } : {}}
      className={appStyle === 'pixel-gemini' ? "mx-1" : ""}
    >
      <Card
        shadow={appStyle !== 'pixel-gemini'}
        className={cn(
          "overflow-hidden w-full",
          appStyle === 'pixel-gemini' ? "border-2 border-outline rounded-none" : ""
        )}
        padding=""
      >
        <div className="flex items-center justify-between border-b border-outline/20 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {t('combo.label', { index: index + 1, total })}
          </span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          {combo.projects.map((project, i) => {
            const allocated = combo.projectMinutes[i];
            const isPartial = allocated < project.estimatedDurationMinutes;
            return (
              <div key={project.id} className="flex items-center gap-3">
                <ColorDot color={project.color} size={12} />
                <span className="flex-1 text-sm text-on-surface truncate">
                  {project.name}
                  {isPartial && (
                    <span className="ml-1.5 text-xs text-warning">{t('combo.partial')}</span>
                  )}
                </span>
                <span className="text-sm text-on-surface-variant shrink-0">~{allocated} min</span>
              </div>
            );
          })}
        </div>
        <div className="mx-4 border-t border-dashed border-outline/30" />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-on-surface">
            {t('combo.total', { minutes: combo.totalMinutes })}
          </span>
          {combo.slackMinutes > 0 ? (
            <span className={cn('text-sm font-medium', slackClass)}>
              {t('combo.free', { minutes: combo.slackMinutes })}
            </span>
          ) : combo.projectMinutes.some((m, i) => m < combo.projects[i].estimatedDurationMinutes) ? (
            <span className="text-sm font-medium text-success">{t('combo.perfectFit')}</span>
          ) : null}
        </div>
        <ProjectColorStrip colors={combo.projects.map(p => p.color)} />
      </Card>
    </div>
  );
}
