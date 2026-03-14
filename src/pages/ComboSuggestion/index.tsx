/**
 * Combo Suggestion page (/combo?minutes=N).
 * Reads minutes from URL param; calls suggestCombos() for up to 3 multi-project sets.
 * Carousel display; Start Combo navigates to /timer with comboGroupId.
 * Dependencies: projectStore, sessionStore, suggestCombos, useSearchParams
 */
import { useState, useMemo, useRef, useCallback } from 'react';
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);

  const sessions = useSessionStore(s => s.sessions);
  const getActiveProjects = useProjectStore(s => s.getActiveProjects);
  const activeProjects = getActiveProjects(sessions);

  const combos = useMemo(() => {
    return suggestCombos({
      projects: activeProjects,
      sessions,
      availableMinutes,
      seed: 0,
    });
  }, [activeProjects, sessions, availableMinutes]);

  const scrollTo = useCallback((index: number): void => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.children[index] as HTMLElement | undefined;
    if (card) {
      carousel.scrollTo({ left: card.offsetLeft - carousel.offsetLeft, behavior: 'instant' });
    }
    setCurrentIndex(index);
  }, []);

  function handlePrev(): void {
    scrollTo((currentIndex - 1 + combos.length) % combos.length);
  }

  function handleNext(): void {
    scrollTo((currentIndex + 1) % combos.length);
  }

  function handleStart(): void {
    const combo = combos[currentIndex];
    if (!combo) return;
    const comboGroupId = crypto.randomUUID();

    // Build per-project allocation map (only for partial combos where allocated < estimated)
    const projectAllocatedMinutes: Record<string, number> = {};
    combo.projects.forEach((p, i) => {
      projectAllocatedMinutes[p.id] = combo.projectMinutes[i];
    });

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
            {/* Carousel */}
            <div className="relative flex items-center gap-2 px-2">
              {/* Left arrow */}
              <button
                onClick={handlePrev}
                disabled={combos.length <= 1}
                className={cn(
                  'shrink-0 rounded-full p-2 bg-surface-variant active:opacity-80 transition-opacity duration-100',
                  combos.length <= 1 ? 'opacity-[0.38] cursor-not-allowed' : '',
                )}
                aria-label={t('combo.prevAriaLabel')}
              >
                ◀
              </button>

              {/* Cards */}
              <div
                ref={carouselRef}
                className="flex-1 flex overflow-x-hidden"
                style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-y' }}
                onPointerDown={e => { swipeStartX.current = e.clientX; }}
                onPointerUp={e => {
                  if (swipeStartX.current === null) return;
                  const delta = e.clientX - swipeStartX.current;
                  swipeStartX.current = null;
                  if (Math.abs(delta) < 40) return;
                  if (delta < 0) handleNext();
                  else handlePrev();
                }}
                onPointerCancel={() => { swipeStartX.current = null; }}
              >
                {combos.map((combo, i) => (
                  <div
                    key={i}
                    style={{ scrollSnapAlign: 'center', flex: '0 0 100%' }}
                  >
                    <ComboCard combo={combo} index={i} total={combos.length} />
                  </div>
                ))}
              </div>

              {/* Right arrow */}
              <button
                onClick={handleNext}
                disabled={combos.length <= 1}
                className={cn(
                  'shrink-0 rounded-full p-2 bg-surface-variant active:opacity-80 transition-opacity duration-100',
                  combos.length <= 1 ? 'opacity-[0.38] cursor-not-allowed' : '',
                )}
                aria-label={t('combo.nextAriaLabel')}
              >
                ▶
              </button>
            </div>

            {/* Dot indicators */}
            {combos.length > 1 && (
              <div className="flex justify-center gap-2">
                {combos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    aria-label={t('combo.dotAriaLabel', { index: i + 1 })}
                    className={cn(
                      'rounded-full w-2 h-2',
                      i === currentIndex ? 'bg-primary' : 'bg-outline/30',
                    )}
                  />
                ))}
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline/20 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {t('combo.label', { index: index + 1, total })}
          </span>
        </div>

        {/* Projects */}
        {/* ComboCard rows keep raw JSX: the trailing "partial" badge prevents clean ProjectNameRow use */}
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
                <span className="text-sm text-on-surface-variant shrink-0">
                  ~{allocated} min
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-dashed border-outline/30" />

        {/* Totals */}
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

        {/* Color bar strip */}
        <ProjectColorStrip colors={combo.projects.map(p => p.color)} />
      </Card>
    </div>
  );
}
