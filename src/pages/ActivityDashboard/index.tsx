import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { BottomSheet } from '@/components/shared/BottomSheet';
import {
  Button,
  Card,
  ComboSessionCard,
  DateDivider,
  OutcomeToggle,
  ProjectNameRow,
  SessionListItem,
  SwipeableSessionCard,
  TabGroup,
} from '@/components/shared';
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
      <TabGroup<ActiveView>
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'history', label: 'History' },
        ]}
        value={activeView}
        onChange={setActiveView}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'overview' ? <OverviewTab /> : <HistoryTab />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab(): React.ReactElement {
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
  const [swipeResetToken, setSwipeResetToken] = useState(0);
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
        height="75dvh"
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
          {groupSessionCards(daySessionsForPanel).map(item => {
            if (item.type === 'single') {
              return (
                <SwipeableSessionCard
                  key={item.session.id}
                  onClick={() => setEditSession(item.session)}
                  onDelete={() => { void deleteSession(item.session.id); setSwipeResetToken(k => k + 1); }}
                  resetToken={swipeResetToken}
                >
                  <SingleSessionCard session={item.session} projects={projects} />
                </SwipeableSessionCard>
              );
            }
            return (
              <ComboSessionCard
                key={item.comboGroupId}
                sessions={item.sessions}
                projects={projects}
                onEditSession={setEditSession}
                onDeleteGroup={() => {
                  for (const s of item.sessions) void deleteSession(s.id);
                  setSwipeResetToken(k => k + 1);
                }}
                onDeleteSession={(session) => {
                  void deleteSession(session.id);
                  setSwipeResetToken(k => k + 1);
                }}
                resetToken={swipeResetToken}
              />
            );
          })}
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
    <Card shadow className="flex flex-col items-center justify-center gap-1 overflow-hidden">
      <p className={cn('font-mono font-bold text-on-surface leading-none', valueSize)}>
        {prefix ? <span className={cn(prefixSize, 'mr-0.5')}>{prefix}</span> : null}
        {displayValue}
      </p>
      <p className="text-xs text-on-surface-variant text-center">
        {label}
      </p>
    </Card>
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
  const [swipeResetToken, setSwipeResetToken] = useState(0);

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
          <DateDivider dateStr={date} />

          {/* Session cards */}
          {groupSessionCards(dateSessions).map(item => {
            if (item.type === 'single') {
              return (
                <SwipeableSessionCard
                  key={item.session.id}
                  onClick={() => setEditSession(item.session)}
                  onDelete={() => { void deleteSession(item.session.id); setSwipeResetToken(k => k + 1); }}
                  resetToken={swipeResetToken}
                >
                  <SingleSessionCard session={item.session} projects={projects} />
                </SwipeableSessionCard>
              );
            }

            return (
              <ComboSessionCard
                key={item.comboGroupId}
                sessions={item.sessions}
                projects={projects}
                onEditSession={setEditSession}
                onDeleteGroup={() => {
                  for (const s of item.sessions) void deleteSession(s.id);
                  setSwipeResetToken(k => k + 1);
                }}
                onDeleteSession={(session) => {
                  void deleteSession(session.id);
                  setSwipeResetToken(k => k + 1);
                }}
                resetToken={swipeResetToken}
              />
            );
          })}
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
  return (
    <SessionListItem
      session={session}
      projectColor={project?.color ?? session.projectColor}
      projectName={project?.name ?? session.projectName}
    />
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
  return (
    <button
      onClick={onEdit}
      className="w-full flex flex-col gap-1 border-b border-outline/20 pb-3 last:border-0 last:pb-0 text-left active:opacity-70"
    >
      <SessionListItem
        session={session}
        projectColor={project?.color ?? session.projectColor}
        projectName={project?.name ?? session.projectName}
        showNoNotesPlaceholder
      />
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
    <BottomSheet isOpen={!!session} onClose={onClose} title="Edit session" height="65dvh" baseZIndex={200}>
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
        <ProjectNameRow
          color={project?.color ?? session.projectColor}
          name={project?.name ?? session.projectName}
          className="flex-1"
        />
        <span className="text-xs text-on-surface-variant shrink-0">
          {dateLabel}
        </span>
      </div>

      {/* Outcome */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-on-surface-variant">Outcome</p>
        <OutcomeToggle value={outcome} onChange={setOutcome} includeAbandoned compactLabels />
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
        <Button variant="filled" onClick={() => void handleSave()} className="flex-1">
          Save
        </Button>
        <Button variant="outlined" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}

