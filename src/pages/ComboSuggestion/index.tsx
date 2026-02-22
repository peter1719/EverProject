import { useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorDot } from '@/components/shared/ColorDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { suggestCombos } from '@/algorithms/combo';
import { cn } from '@/lib/utils';
import { COLOR_HEX_MAP } from '@/lib/constants';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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
    if (currentIndex > 0) scrollTo(currentIndex - 1);
  }

  function handleNext(): void {
    if (currentIndex < combos.length - 1) scrollTo(currentIndex + 1);
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
    };
    navigate('/timer', { state });
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Combo mode"
        showBack
        backPath="/suggest"
        rightSlot={
          <span className="flex items-center px-4 text-sm text-on-surface-variant">
            {availableMinutes} min
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-4">
        {combos.length === 0 && (
          <EmptyState
            title={`No combos for ${availableMinutes} min.`}
            subtitle="← Try a different time"
          />
        )}

        {combos.length > 0 && (
          <>
            {/* Carousel */}
            <div className="relative flex items-center gap-2 px-2">
              {/* Left arrow */}
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={cn(
                  'shrink-0 rounded-full p-2 bg-surface-variant active:opacity-80 transition-opacity duration-100',
                  currentIndex === 0 ? 'opacity-[0.38] cursor-not-allowed' : '',
                )}
                aria-label="Previous combo"
              >
                ◀
              </button>

              {/* Cards */}
              <div
                ref={carouselRef}
                className="flex-1 flex overflow-x-hidden"
                style={{ scrollSnapType: 'x mandatory' }}
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
                disabled={currentIndex === combos.length - 1}
                className={cn(
                  'shrink-0 rounded-full p-2 bg-surface-variant active:opacity-80 transition-opacity duration-100',
                  currentIndex === combos.length - 1 ? 'opacity-[0.38] cursor-not-allowed' : '',
                )}
                aria-label="Next combo"
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
                    aria-label={`Combo ${i + 1}`}
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
              <button
                onClick={handleStart}
                className="w-full h-12 rounded-xl bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100"
              >
                ▶ Start this combo
              </button>
            </div>
          </>
        )}
      </div>
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
  const slackClass =
    combo.slackMinutes <= 5
      ? 'text-success'
      : combo.slackMinutes <= 15
        ? 'text-warning'
        : 'text-on-surface-variant';

  return (
    <div className="bg-surface-variant rounded-xl shadow-sm mx-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline/20 px-4 py-3">
        <span className="text-sm font-medium text-primary">
          Combo {index + 1} / {total}
        </span>
      </div>

      {/* Projects */}
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
                  <span className="ml-1.5 text-xs text-warning">partial</span>
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
          Total: ~{combo.totalMinutes} min
        </span>
        {combo.slackMinutes > 0 ? (
          <span className={cn('text-sm font-medium', slackClass)}>
            {combo.slackMinutes} min free
          </span>
        ) : combo.projectMinutes.some((m, i) => m < combo.projects[i].estimatedDurationMinutes) ? (
          <span className="text-sm font-medium text-success">Perfect fit</span>
        ) : null}
      </div>

      {/* Color bar strip */}
      <div className="flex h-1.5">
        {combo.projects.map((project, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: COLOR_HEX_MAP[project.color] }}
          />
        ))}
      </div>
    </div>
  );
}
