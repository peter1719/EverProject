import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { ColorDot } from '@/components/shared/ColorDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
import { formatDuration, toDateString } from '@/lib/utils';

import { cn } from '@/lib/utils';
import type { Session, SessionOutcome, Project } from '@/types';

type ActiveView = 'overview' | 'history';

export function ActivityDashboard(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const defaultView: ActiveView =
    searchParams.get('view') === 'history' ? 'history' : 'overview';
  const [activeView, setActiveView] = useState<ActiveView>(defaultView);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Activity" />

      {/* View toggle */}
      <div className="flex border-b border-outline/30">
        {(['overview', 'history'] as ActiveView[]).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-r last:border-r-0 border-outline/30',
              activeView === view
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant bg-surface',
            )}
          >
            {view === 'overview' ? 'Overview' : 'History'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'overview' ? <OverviewTab /> : <HistoryTab />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab(): React.ReactElement {
  const sessions = useSessionStore(s => s.sessions);
  const getTotalSessionCount = useSessionStore(s => s.getTotalSessionCount);
  const getTotalMinutes = useSessionStore(s => s.getTotalMinutes);
  const getCurrentStreak = useSessionStore(s => s.getCurrentStreak);
  const getDailyActivity = useSessionStore(s => s.getDailyActivity);
  const getSessionsForDay = useSessionStore(s => s.getSessionsForDay);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const projects = useProjectStore(s => s.projects);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [scrollToEnd, setScrollToEnd] = useState(0);
  const [daysToLoad, setDaysToLoad] = useState(365);

  const isFullyLoaded = daysToLoad >= MAX_HISTORY_DAYS;

  const handleLoadMore = useCallback(() => {
    setDaysToLoad(d => Math.min(d + 365, MAX_HISTORY_DAYS));
  }, []);

  const totalCount = getTotalSessionCount();
  const totalMinutes = getTotalMinutes();
  const streak = getCurrentStreak();
  const dailyActivity = getDailyActivity(daysToLoad);

  const heatmapValues = dailyActivity.map(d => ({
    date: d.date,
    count: d.count,
  }));

  const daySessionsForPanel = selectedDay ? getSessionsForDay(selectedDay) : [];

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={totalCount} label="Sessions" prefix="" />
        <StatTile value={totalMinutes} label="Focused" isMinutes />
        <StatTile value={streak} label="Day streak" prefix={streak > 0 ? '🔥' : undefined} />
      </div>

      {/* Heatmap */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-on-surface-variant">Focus log</p>
          <button
            onClick={() => setScrollToEnd(n => n + 1)}
            className="text-xs font-medium text-primary active:opacity-70"
          >
            Today
          </button>
        </div>
        <ActivityHeatmap
          values={heatmapValues}
          scrollToEnd={scrollToEnd}
          onLoadMore={handleLoadMore}
          isFullyLoaded={isFullyLoaded}
          onDayClick={(date) => setSelectedDay(date)}
        />
        {/* Heatmap CSS — warm amber scale */}
        <style>{`
          .heatmap-empty { background-color: #F4EDE0; }
          .heatmap-low   { background-color: #F5C4A0; }
          .heatmap-mid   { background-color: #C75B21; }
          .heatmap-high  { background-color: #8C3A0E; }
          @media (prefers-color-scheme: dark) {
            .heatmap-empty { background-color: #261C0F; }
            .heatmap-low   { background-color: #5C3010; }
            .heatmap-mid   { background-color: #C75B21; }
            .heatmap-high  { background-color: #A04C28; }
          }
        `}</style>
      </div>

      {/* Day Detail sheet */}
      <BottomSheet
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay
          ? `${new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${daySessionsForPanel.length} session${daySessionsForPanel.length !== 1 ? 's' : ''}`
          : 'Day detail'}
      >
        <div className="flex flex-col gap-2 p-4">
          {daySessionsForPanel.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4">
              No sessions this day.
            </p>
          )}
          {daySessionsForPanel.map(session => (
            <SwipeableSessionCard
              key={session.id}
              onClick={() => {}}
              onDelete={() => void deleteSession(session.id)}
            >
              <SessionRow
                session={session}
                projects={projects}
                onEdit={() => setEditSession(session)}
              />
            </SwipeableSessionCard>
          ))}
        </div>
      </BottomSheet>

      {/* Edit session sheet */}
      <EditSessionSheet
        session={editSession}
        onClose={() => setEditSession(null)}
      />
    </div>
  );
}

// ── StatTile ──────────────────────────────────────────────────────────────────

interface StatTileProps {
  readonly value: number;
  readonly label: string;
  readonly isMinutes?: boolean;
  readonly prefix?: string;
}

function StatTile({ value, label, isMinutes, prefix }: StatTileProps): React.ReactElement {
  const displayValue = isMinutes ? formatDuration(value) : String(value);
  const totalLen = (prefix ? 1 : 0) + displayValue.length;
  const valueSize = totalLen >= 8 ? 'text-base' : totalLen >= 6 ? 'text-xl' : 'text-3xl';
  const prefixSize = totalLen >= 6 ? 'text-base' : 'text-xl';

  return (
    <div className="bg-surface-variant rounded-xl p-4 shadow-sm flex flex-col items-center justify-center gap-1 overflow-hidden">
      <p className={cn('font-mono font-bold text-on-surface leading-none', valueSize)}>
        {prefix ? <span className={cn(prefixSize, 'mr-0.5')}>{prefix}</span> : null}
        {displayValue}
      </p>
      <p className="text-xs text-on-surface-variant text-center">
        {label}
      </p>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function HistoryTab(): React.ReactElement {
  const sessions = useSessionStore(s => s.sessions);
  const getSessionsForHistory = useSessionStore(s => s.getSessionsForHistory);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const projects = useProjectStore(s => s.projects);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);

  const filteredSessions = useMemo(() => {
    return getSessionsForHistory(filterProjectId ?? undefined);
  }, [filterProjectId, getSessionsForHistory, sessions]);

  const grouped = useMemo(() => {
    const visible = filteredSessions.slice(0, visibleCount);
    const map = new Map<string, Session[]>();
    for (const s of visible) {
      const date = toDateString(s.startedAt);
      const arr = map.get(date) ?? [];
      arr.push(s);
      map.set(date, arr);
    }
    return [...map.entries()];
  }, [filteredSessions, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount(c => c + PAGE_SIZE);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const activeProjects = projects.filter(p => !p.isArchived);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Project filter */}
      <ProjectFilter
        value={filterProjectId}
        projects={activeProjects}
        onChange={id => {
          setFilterProjectId(id);
          setVisibleCount(PAGE_SIZE);
        }}
      />

      {/* Sessions */}
      {filteredSessions.length === 0 && (
        filterProjectId
          ? <EmptyState
              title={`No sessions for ${projects.find(p => p.id === filterProjectId)?.name ?? 'project'}.`}
            />
          : <EmptyState title="No activity yet." />
      )}

      {grouped.map(([date, dateSessions]) => (
        <div key={date} className="flex flex-col gap-2">
          {/* Date group header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-on-surface-variant shrink-0">
              {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
            <div className="flex-1 border-t border-outline/30" />
          </div>

          {/* Session cards */}
          {groupSessionCards(dateSessions).map((item, i) => (
            <SwipeableSessionCard
              key={i}
              onClick={() => {
                if (item.type === 'single') setEditSession(item.session);
                else setEditSession(item.sessions[item.sessions.length - 1] ?? null);
              }}
              onDelete={() => {
                if (item.type === 'single') {
                  void deleteSession(item.session.id);
                } else {
                  for (const s of item.sessions) void deleteSession(s.id);
                }
              }}
            >
              {item.type === 'single' ? (
                <SingleSessionCard session={item.session} projects={projects} />
              ) : (
                <ComboSessionCard sessions={item.sessions} projects={projects} />
              )}
            </SwipeableSessionCard>
          ))}
        </div>
      ))}

      {visibleCount < filteredSessions.length && (
        <div ref={sentinelRef} className="h-4" />
      )}

      <EditSessionSheet
        session={editSession}
        onClose={() => setEditSession(null)}
      />
    </div>
  );
}

// ── ActivityHeatmap ───────────────────────────────────────────────────────────

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${month} '${String(d.getFullYear()).slice(2)}`;
}

const MAX_HISTORY_DAYS = 365 * 5; // 5 years hard cap

const CELL = 32;
const GAP = 6;
const TOTAL = CELL + GAP;
// Sun=0 Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6 — show labels for Mon/Wed/Fri
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function toLocalDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

interface HeatmapValue {
  readonly date: string;
  readonly count: number;
}

interface ActivityHeatmapProps {
  readonly values: HeatmapValue[];
  readonly onDayClick?: (date: string) => void;
  readonly scrollToEnd?: number;
  readonly onLoadMore?: () => void;
  readonly isFullyLoaded?: boolean;
}

function ActivityHeatmap({ values, onDayClick, scrollToEnd, onLoadMore, isFullyLoaded }: ActivityHeatmapProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v.date, v.count);
    return m;
  }, [values]);

  // Build week columns: each column = [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  const weeks = useMemo((): (string | null)[][] => {
    if (values.length === 0) return [];
    const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date + 'T12:00:00');
    const last  = new Date(sorted[sorted.length - 1].date + 'T12:00:00');

    // Snap to surrounding Sunday–Saturday boundaries
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay()); // prev or same Sunday
    const end = new Date(last);
    end.setDate(end.getDate() + (6 - end.getDay())); // next or same Saturday

    const cols: (string | null)[][] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const week: (string | null)[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(cur >= first && cur <= last ? toLocalDateStr(cur) : null);
        cur.setDate(cur.getDate() + 1);
      }
      cols.push(week);
    }
    return cols;
  }, [values]);

  // On mount: scroll to today. When weeks grow (history prepended): compensate scrollLeft
  // so the visible position stays exactly where the user was.
  const prevWeeksLengthRef = useRef(0);
  const loadingMoreRef = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prevLen = prevWeeksLengthRef.current;
    const newLen = weeks.length;
    prevWeeksLengthRef.current = newLen;
    loadingMoreRef.current = false; // new data arrived — allow the next trigger

    if (prevLen === 0) {
      el.scrollLeft = el.scrollWidth; // initial: show today
    } else if (newLen > prevLen) {
      el.scrollLeft += (newLen - prevLen) * TOTAL; // shift right to keep same view
    }
  }, [weeks]);

  // Today button: jump back to the rightmost position
  useEffect(() => {
    if (!scrollToEnd) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [scrollToEnd]);

  // Load more history when the user scrolls within ~8 weeks of the left edge
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isFullyLoaded) return;
    function handleNearEdge(): void {
      if (!el || loadingMoreRef.current) return;
      if (el.scrollLeft < TOTAL * 8) {
        loadingMoreRef.current = true;
        onLoadMore?.();
      }
    }
    el.addEventListener('scroll', handleNearEdge, { passive: true });
    return () => el.removeEventListener('scroll', handleNearEdge);
  }, [isFullyLoaded, onLoadMore]);

  function cellClass(date: string | null): string {
    if (!date) return '';
    const count = countMap.get(date) ?? 0;
    if (count === 0) return 'heatmap-empty';
    if (count <= 2) return 'heatmap-low';
    if (count <= 4) return 'heatmap-mid';
    return 'heatmap-high';
  }

  return (
    <div
      data-testid="heatmap"
      className="flex"
      style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'var(--on-surface-variant)' }}
    >
      {/* Sticky weekday labels — outside the scroll container */}
      <div className="shrink-0" style={{ width: 36, paddingTop: 22 }}>
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            style={{
              height: CELL,
              marginBottom: i < 6 ? GAP : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 4,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Scrollable grid with month labels on top */}
      <div
        ref={scrollRef}
        data-testid="heatmap-scroll"
        className="flex-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      >
        <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
          {/* Month labels row */}
          <div style={{ display: 'flex', height: 22, marginBottom: 4 }}>
            {weeks.map((week, wi) => {
              const firstDay = week.find(d => d !== null);
              const prevFirstDay = wi > 0 ? weeks[wi - 1].find(d => d !== null) : null;
              const isNewMonth =
                firstDay &&
                (!prevFirstDay || firstDay.slice(5, 7) !== prevFirstDay.slice(5, 7));
              return (
                <div key={wi} style={{ width: TOTAL, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {isNewMonth && firstDay ? monthLabel(firstDay) : ''}
                </div>
              );
            })}
          </div>

          {/* Cell grid */}
          <div style={{ display: 'flex' }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ marginRight: GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={cellClass(day)}
                    style={{
                      width: CELL,
                      height: CELL,
                      marginBottom: di < 6 ? GAP : 0,
                      borderRadius: 2,
                      cursor: day ? 'pointer' : 'default',
                      opacity: day ? 1 : 0,
                    }}
                    onClick={() => day && onDayClick?.(day)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SwipeableSessionCard ──────────────────────────────────────────────────────

const REVEAL_WIDTH = 72;
const DRAG_THRESHOLD = 8;
const SNAP_THRESHOLD = 30;

function SwipeableSessionCard({
  children,
  onDelete,
  onClick,
}: {
  readonly children: React.ReactNode;
  readonly onDelete: () => void;
  readonly onClick: () => void;
}): React.ReactElement {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    baseOffsetRef.current = revealed ? -REVEAL_WIDTH : 0;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    // Let vertical scroll win when it clearly dominates
    if (!hasDraggedRef.current && Math.abs(dy) > Math.abs(dx)) {
      isDraggingRef.current = false;
      setOffset(baseOffsetRef.current);
      return;
    }
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    hasDraggedRef.current = true;
    setOffset(Math.min(0, Math.max(-REVEAL_WIDTH, baseOffsetRef.current + dx)));
  }

  function handlePointerUp(): void {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = offset - baseOffsetRef.current;
    if (dx < -SNAP_THRESHOLD) {
      setOffset(-REVEAL_WIDTH);
      setRevealed(true);
    } else if (dx > SNAP_THRESHOLD && revealed) {
      setOffset(0);
      setRevealed(false);
    } else {
      setOffset(revealed ? -REVEAL_WIDTH : 0);
    }
  }

  function handleClick(): void {
    if (hasDraggedRef.current) return;
    if (revealed) {
      setOffset(0);
      setRevealed(false);
    } else {
      onClick();
    }
  }

  return (
    <div className="overflow-hidden rounded-xl">
      {/* Flex row: card + delete zone slide together so hit areas stay correct */}
      <div
        style={{
          display: 'flex',
          transform: `translateX(${offset}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {/* Card */}
        <div
          className="bg-surface-variant shadow-sm px-4 py-4 w-full shrink-0"
          style={{
            touchAction: 'pan-y',
            cursor: 'pointer',
            userSelect: 'none',
            minHeight: 68,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
        >
          {children}
        </div>

        {/* Delete zone — always REVEAL_WIDTH px to the right; clipped until swiped */}
        <div
          className="bg-error shrink-0 flex items-center justify-center"
          style={{ width: REVEAL_WIDTH }}
        >
          <button
            className="h-full w-full flex items-center justify-center text-white text-sm font-medium"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ProjectFilter ─────────────────────────────────────────────────────────────

interface ProjectFilterProps {
  readonly value: string | null;
  readonly projects: Project[];
  readonly onChange: (id: string | null) => void;
}

function ProjectFilter({ value, projects, onChange }: ProjectFilterProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const selectedLabel = value
    ? (projects.find(p => p.id === value)?.name ?? 'All projects')
    : 'All projects';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-xl border border-outline bg-surface text-on-surface px-3 py-3 text-sm active:opacity-80 transition-opacity duration-100"
      >
        <span>{selectedLabel}</span>
        <span className="text-on-surface-variant text-xs ml-2" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-10 left-0 right-0 top-[calc(100%+4px)] bg-surface rounded-xl border border-outline shadow-lg overflow-hidden"
        >
          <div
            role="option"
            aria-selected={value === null}
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              'px-4 py-3 text-sm border-b border-outline/20 cursor-pointer',
              value === null ? 'bg-primary text-on-primary' : 'text-on-surface',
            )}
          >
            All projects
          </div>
          {projects.map(p => (
            <div
              key={p.id}
              role="option"
              aria-selected={value === p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={cn(
                'px-4 py-3 text-sm border-b border-outline/20 last:border-0 cursor-pointer',
                value === p.id ? 'bg-primary text-on-primary' : 'text-on-surface',
              )}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Group sessions by comboGroupId
type SessionCardItem =
  | { type: 'single'; session: Session }
  | { type: 'combo'; sessions: Session[]; comboGroupId: string };

function groupSessionCards(sessions: Session[]): SessionCardItem[] {
  const items: SessionCardItem[] = [];
  const comboGroups = new Map<string, Session[]>();

  for (const s of sessions) {
    if (s.wasCombo && s.comboGroupId) {
      const arr = comboGroups.get(s.comboGroupId) ?? [];
      arr.push(s);
      comboGroups.set(s.comboGroupId, arr);
    } else {
      items.push({ type: 'single', session: s });
    }
  }

  for (const [id, groupSessions] of comboGroups.entries()) {
    items.push({ type: 'combo', sessions: groupSessions, comboGroupId: id });
  }

  return items.sort((a, b) => {
    const aTime = a.type === 'single' ? a.session.startedAt : (a.sessions[0]?.startedAt ?? 0);
    const bTime = b.type === 'single' ? b.session.startedAt : (b.sessions[0]?.startedAt ?? 0);
    return bTime - aTime;
  });
}

// ── SingleSessionCard ─────────────────────────────────────────────────────────

function SingleSessionCard({
  session,
  projects,
}: {
  session: Session;
  projects: ReturnType<typeof useProjectStore.getState>['projects'];
}): React.ReactElement {
  const project = projects.find(p => p.id === session.projectId);
  const { icon, colorClass } = outcomeStyle(session.outcome);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={cn('text-base shrink-0', colorClass)}>
          {icon}
        </span>
        <ColorDot color={project?.color ?? session.projectColor} size={10} />
        <span className="flex-1 text-sm text-on-surface truncate">
          {project?.name ?? session.projectName}
        </span>
        <span className="text-xs text-on-surface-variant shrink-0">
          {session.actualDurationMinutes}M
        </span>
      </div>
      {session.notes && (
        <p className="text-xs text-on-surface-variant truncate pl-6 italic">
          "{session.notes}"
        </p>
      )}
    </div>
  );
}

// ── ComboSessionCard ──────────────────────────────────────────────────────────

function ComboSessionCard({
  sessions,
  projects,
}: {
  sessions: Session[];
  projects: ReturnType<typeof useProjectStore.getState>['projects'];
}): React.ReactElement {
  const totalMinutes = sessions.reduce((s, sess) => s + sess.actualDurationMinutes, 0);
  const lastNotes = sessions.find(s => s.notes)?.notes;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-base text-primary">⧉</span>
        <span className="flex-1 text-sm font-medium text-on-surface">
          Combo session
        </span>
        <span className="text-xs text-on-surface-variant shrink-0">
          {totalMinutes}M
        </span>
      </div>
      {sessions.map(s => {
        const project = projects.find(p => p.id === s.projectId);
        return (
          <div key={s.id} className="flex items-center gap-2 pl-4">
            <ColorDot color={project?.color ?? s.projectColor} size={10} />
            <span className="text-xs text-on-surface-variant truncate">
              {project?.name ?? s.projectName}
            </span>
          </div>
        );
      })}
      {lastNotes && (
        <p className="text-xs text-on-surface-variant truncate pl-4 italic">
          "{lastNotes}"
        </p>
      )}
    </div>
  );
}

// ── SessionRow (for Day Detail panel) ────────────────────────────────────────

function SessionRow({
  session,
  projects,
  onEdit,
}: {
  session: Session;
  projects: ReturnType<typeof useProjectStore.getState>['projects'];
  onEdit: () => void;
}): React.ReactElement {
  const project = projects.find(p => p.id === session.projectId);
  const { icon, colorClass } = outcomeStyle(session.outcome);
  return (
    <button
      onClick={onEdit}
      className="w-full flex flex-col gap-1 border-b border-outline/20 pb-3 last:border-0 last:pb-0 text-left active:opacity-70"
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-base shrink-0', colorClass)}>
          {icon}
        </span>
        <ColorDot color={project?.color ?? session.projectColor} size={10} />
        <span className="flex-1 text-sm text-on-surface truncate">
          {project?.name ?? session.projectName}
        </span>
        <span className="text-xs text-on-surface-variant shrink-0">
          {session.actualDurationMinutes}M
        </span>
      </div>
      {session.notes ? (
        <p className="text-xs text-on-surface-variant pl-6 truncate italic">
          "{session.notes}"
        </p>
      ) : (
        <p className="text-xs text-on-surface-variant/50 pl-6">(no notes)</p>
      )}
    </button>
  );
}

// ── EditSessionSheet ──────────────────────────────────────────────────────────

function EditSessionSheet({
  session,
  onClose,
}: {
  session: Session | null;
  onClose: () => void;
}): React.ReactElement {
  return (
    <BottomSheet isOpen={!!session} onClose={onClose} title="Edit session">
      {session && (
        <EditSessionForm key={session.id} session={session} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function EditSessionForm({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}): React.ReactElement {
  const updateSession = useSessionStore(s => s.updateSession);
  const projects = useProjectStore(s => s.projects);
  const [outcome, setOutcome] = useState<SessionOutcome>(session.outcome);
  const [notes, setNotes] = useState(session.notes);
  const project = projects.find(p => p.id === session.projectId);

  async function handleSave(): Promise<void> {
    await updateSession(session.id, { outcome, notes });
    onClose();
  }

  const dateLabel = new Date(session.startedAt)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Session identity */}
      <div className="flex items-center gap-2">
        <ColorDot color={project?.color ?? session.projectColor} size={12} />
        <span className="flex-1 text-sm font-medium text-on-surface truncate">
          {project?.name ?? session.projectName}
        </span>
        <span className="text-xs text-on-surface-variant shrink-0">
          {dateLabel}
        </span>
      </div>

      {/* Outcome */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-on-surface-variant">Outcome</p>
        <OutcomeToggleEdit value={outcome} onChange={setOutcome} />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-on-surface-variant">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 500))}
          placeholder="Add notes..."
          rows={3}
          className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-2">
        <button
          onClick={() => void handleSave()}
          className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-xl border border-outline text-on-surface-variant bg-transparent font-medium active:opacity-80 transition-opacity duration-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Compact 3-option toggle for edit sheet
function OutcomeToggleEdit({
  value,
  onChange,
}: {
  value: SessionOutcome;
  onChange: (v: SessionOutcome) => void;
}): React.ReactElement {
  const options: Array<{ label: string; value: SessionOutcome; activeClass: string }> = [
    { label: '✓', value: 'completed', activeClass: 'bg-success text-white' },
    { label: '~', value: 'partial', activeClass: 'bg-warning text-white' },
    { label: '✕', value: 'abandoned', activeClass: 'bg-error text-white' },
  ];
  return (
    <div className="flex rounded-xl overflow-hidden border border-outline/30">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium',
            i < options.length - 1 ? 'border-r border-outline/30' : '',
            value === opt.value ? opt.activeClass : 'text-on-surface-variant',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function outcomeStyle(outcome: SessionOutcome): { icon: string; colorClass: string } {
  switch (outcome) {
    case 'completed': return { icon: '✓', colorClass: 'text-success' };
    case 'partial':   return { icon: '~', colorClass: 'text-warning' };
    case 'abandoned': return { icon: '✕', colorClass: 'text-error' };
  }
}
