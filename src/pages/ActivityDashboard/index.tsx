import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { BottomSheet } from '@/components/shared/BottomSheet';
import {
  Card,
  ComboSessionCard,
  DateDivider,
  EditSessionSheet,
  ImageLightbox,
  SessionListItem,
  SwipeableSessionCard,
  TabGroup,
} from '@/components/shared';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDuration, toDateString } from '@/lib/utils';

import { cn } from '@/lib/utils';
import type { Session, Project } from '@/types';

type ActiveView = 'overview' | 'history';

export function ActivityDashboard(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const defaultView: ActiveView =
    searchParams.get('view') === 'history' ? 'history' : 'overview';
  const [activeView, setActiveView] = useState<ActiveView>(defaultView);

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t('page.activity')}
        onTitlePress={activeView === 'history'
          ? () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          : undefined}
        rightSlot={
          <button
            onClick={() => navigate('/settings')}
            aria-label={t('stats.openSettings')}
            className="flex items-center justify-center w-11 h-11 mr-2 my-auto rounded-xl text-on-surface-variant active:opacity-80 transition-opacity duration-100"
          >
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      {/* View toggle */}
      <TabGroup<ActiveView>
        options={[
          { value: 'overview', label: t('stats.overview') },
          { value: 'history', label: t('stats.history') },
        ]}
        value={activeView}
        onChange={setActiveView}
      />

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {activeView === 'overview' ? <OverviewTab /> : <HistoryTab />}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab(): React.ReactElement {
  const { t } = useTranslation();
  const sessions = useSessionStore(s => s.sessions);
  const getTotalSessionCount = useSessionStore(s => s.getTotalSessionCount);
  const getTotalMinutes = useSessionStore(s => s.getTotalMinutes);
  const getCurrentStreak = useSessionStore(s => s.getCurrentStreak);
  const getDailyActivity = useSessionStore(s => s.getDailyActivity);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const projects = useProjectStore(s => s.projects);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
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

  const daySessionsForPanel = useMemo(
    () => selectedDay ? sessions.filter(s => toDateString(s.startedAt) === selectedDay) : [],
    [sessions, selectedDay],
  );

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={totalCount} label={t('stats.sessions')} prefix="" />
        <StatTile value={totalMinutes} label={t('stats.focused')} isMinutes />
        <StatTile value={streak} label={t('stats.dayStreak')} prefix={streak > 0 ? '🔥' : undefined} />
      </div>

      {/* Heatmap */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-on-surface-variant">{t('stats.focusLog')}</p>
          <button
            onClick={() => setScrollToEnd(n => n + 1)}
            className="text-xs font-medium text-primary active:opacity-70"
          >
            {t('stats.today')}
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
          .heatmap-empty { background-color: #E0D5C3; }
          .heatmap-low   { background-color: #F5C4A0; }
          .heatmap-mid   { background-color: #C75B21; }
          .heatmap-high  { background-color: #8C3A0E; }
          @media (prefers-color-scheme: dark) {
            html:not([data-theme]) .heatmap-empty { background-color: #261C0F; }
            html:not([data-theme]) .heatmap-low   { background-color: #5C3010; }
            html:not([data-theme]) .heatmap-mid   { background-color: #C75B21; }
            html:not([data-theme]) .heatmap-high  { background-color: #A04C28; }
          }
          html[data-theme="dark"] .heatmap-empty { background-color: #261C0F; }
          html[data-theme="dark"] .heatmap-low   { background-color: #5C3010; }
          html[data-theme="dark"] .heatmap-mid   { background-color: #C75B21; }
          html[data-theme="dark"] .heatmap-high  { background-color: #A04C28; }
        `}</style>
      </div>

      {/* Day Detail sheet */}
      <BottomSheet
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        height="75dvh"
        title={selectedDay
          ? `${new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${daySessionsForPanel.length !== 1 ? t('stats.sessionCountPlural', { count: daySessionsForPanel.length }) : t('stats.sessionCount', { count: daySessionsForPanel.length })}`
          : ''}
      >
        <div className="flex flex-col gap-2 p-4">
          {daySessionsForPanel.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4">
              {t('stats.noSessionsDay')}
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
                  <SingleSessionCard session={item.session} projects={projects} onLightbox={setLightboxSrc} />
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
        baseZIndex={200}
      />
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
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
  const { t } = useTranslation();
  const getSessionsForHistory = useSessionStore(s => s.getSessionsForHistory);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const projects = useProjectStore(s => s.projects);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [swipeResetToken, setSwipeResetToken] = useState(0);

  const filteredSessions = useMemo(() => {
    let result = getSessionsForHistory(filterProjectId ?? undefined);
    if (filterDate) result = result.filter(s => toDateString(s.startedAt) === filterDate);
    return result;
  }, [filterProjectId, filterDate, getSessionsForHistory]);

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
      {/* Filters row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setFilterProjectId(null); setFilterDate(null); setVisibleCount(PAGE_SIZE); }}
          disabled={!filterProjectId && !filterDate}
          aria-label={t('stats.resetFilters')}
          className="shrink-0 rounded-xl border border-outline bg-surface text-on-surface-variant px-3 py-3 text-sm transition-opacity duration-100 active:opacity-70 disabled:opacity-30 disabled:cursor-default"
        >
          {t('stats.resetFilters')}
        </button>
        <div className="flex-1 min-w-0">
          <ProjectFilter
            value={filterProjectId}
            projects={activeProjects}
            onChange={id => {
              setFilterProjectId(id);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        </div>
        <DateFilterButton
          value={filterDate}
          onChange={date => {
            setFilterDate(date);
            setVisibleCount(PAGE_SIZE);
          }}
        />
      </div>

      {/* Sessions */}
      {filteredSessions.length === 0 && (
        filterProjectId || filterDate
          ? <EmptyState title={t('stats.noSessionsFound')} />
          : <EmptyState title={t('stats.noActivity')} />
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
                  <SingleSessionCard session={item.session} projects={projects} onLightbox={setLightboxSrc} />
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
        baseZIndex={200}
      />
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
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
  const { t } = useTranslation();
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
    ? (projects.find(p => p.id === value)?.name ?? t('stats.allProjects'))
    : t('stats.allProjects');

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
        <span className="truncate">{selectedLabel}</span>
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
            {t('stats.allProjects')}
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

// ── DateFilterButton ──────────────────────────────────────────────────────────

interface DateFilterProps {
  readonly value: string | null;
  readonly onChange: (date: string | null) => void;
}

function DateFilterButton({ value, onChange }: DateFilterProps): React.ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const label = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : t('stats.date');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'shrink-0 flex items-center rounded-xl border px-3 py-3 text-sm whitespace-nowrap active:opacity-80 transition-opacity duration-100',
          value
            ? 'border-primary bg-primary-container text-on-primary-container'
            : 'border-outline bg-surface text-on-surface-variant',
        )}
      >
        {label}
      </button>
      {open && (
        <DatePicker
          value={value}
          onConfirm={date => { onChange(date); setOpen(false); }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── DatePicker ────────────────────────────────────────────────────────────────

interface DatePickerProps {
  readonly value: string | null;
  readonly onConfirm: (date: string) => void;
  readonly onCancel: () => void;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DatePicker({ value, onConfirm, onCancel }: DatePickerProps): React.ReactElement {
  const { t } = useTranslation();
  const [todayStr] = useState(() => toDateString(Date.now()));
  const initial = value ?? todayStr;
  const [selected, setSelected] = useState<string>(initial);
  const [viewYear, setViewYear] = useState(() => parseInt(initial.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(initial.slice(5, 7)) - 1);

  const days = useMemo<(string | null)[]>(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: (string | null)[] = Array<null>(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(
        `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      );
    }
    // Always 6 rows × 7 cols = 42 cells so the card height never changes
    while (grid.length < 42) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  function prevMonth(): void {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth(): void {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const monthName = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-US', { month: 'long' });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-6"
      onPointerDown={onCancel}
    >
      <div
        className="bg-surface rounded-2xl p-4 w-full max-w-sm shadow-xl max-h-[90dvh] overflow-y-auto"
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Unified calendar box */}
        <div className="bg-surface-variant rounded-xl p-3 landscape:p-2 mb-4 landscape:mb-2">
          {/* Year + Month navigation */}
          <div className="flex items-center justify-center gap-3 mb-3 landscape:mb-1">
            {/* Year group */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setViewYear(y => y - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20 transition-colors"
              >
                ◀
              </button>
              <span className="w-[3.25rem] text-center text-sm font-semibold text-on-surface tabular-nums">
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear(y => y + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20 transition-colors"
              >
                ▶
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-outline/30 shrink-0" />

            {/* Month group */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20 transition-colors"
              >
                ◀
              </button>
              <span className="w-24 text-center text-sm font-medium text-on-surface-variant">
                {monthName}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20 transition-colors"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_INITIALS.map((d, i) => (
              <div key={i} className="h-9 landscape:h-7 flex items-center justify-center text-xs font-medium text-on-surface-variant">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <div key={i} className="h-9 landscape:h-7 flex items-center justify-center">
                {day && (
                  <button
                    type="button"
                    onClick={() => setSelected(day)}
                    className={cn(
                      'w-9 h-9 landscape:w-7 landscape:h-7 rounded-full text-sm transition-colors',
                      selected === day
                        ? 'bg-primary text-on-primary font-medium'
                        : day === todayStr
                        ? 'border border-primary text-primary'
                        : 'text-on-surface active:bg-outline/20',
                    )}
                  >
                    {parseInt(day.slice(8))}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-outline text-primary bg-transparent rounded-xl h-10 px-5 text-sm active:opacity-80 transition-opacity duration-100"
          >
            {t('btn.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="bg-primary text-on-primary rounded-xl h-10 px-5 text-sm active:opacity-80 transition-opacity duration-100"
          >
            {t('btn.ok')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
  onLightbox,
}: {
  session: Session;
  projects: ReturnType<typeof useProjectStore.getState>['projects'];
  onLightbox?: (src: string) => void;
}): React.ReactElement {
  const project = projects.find(p => p.id === session.projectId);
  return (
    <SessionListItem
      session={session}
      projectColor={project?.color ?? session.projectColor}
      projectName={project?.name ?? session.projectName}
      onLightbox={onLightbox}
    />
  );
}


