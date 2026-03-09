import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Card,
  ComboSessionCard,
  DateDivider,
  EditSessionSheet,
  ImageLightbox,
  SessionListItem,
  SwipeableSessionCard,
} from '@/components/shared';
import { EmptyState } from '@/components/shared/EmptyState';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDuration, toDateString } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Session, Project } from '@/types';

// ── Shared types & helpers ────────────────────────────────────────────────────

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

function SingleSessionCard({
  session,
  projects,
  onLightbox,
}: {
  session: Session;
  projects: Project[];
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

// ── StatTile ──────────────────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  isMinutes,
  prefix,
}: {
  value: number;
  label: string;
  isMinutes?: boolean;
  prefix?: string;
}): React.ReactElement {
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
      <p className="text-xs text-on-surface-variant text-center">{label}</p>
    </Card>
  );
}

// ── ActivityHeatmap ───────────────────────────────────────────────────────────

const CELL = 28;
const GAP = 5;
const TOTAL = CELL + GAP;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MAX_HISTORY_DAYS = 365 * 5;

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${month} '${String(d.getFullYear()).slice(2)}`;
}

function toLocalDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function ActivityHeatmap({
  values,
  onDayClick,
  scrollToEnd,
  onLoadMore,
  isFullyLoaded,
}: {
  values: { date: string; count: number }[];
  onDayClick?: (date: string) => void;
  scrollToEnd?: number;
  onLoadMore?: () => void;
  isFullyLoaded?: boolean;
}): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v.date, v.count);
    return m;
  }, [values]);

  const weeks = useMemo((): (string | null)[][] => {
    if (values.length === 0) return [];
    const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date + 'T12:00:00');
    const last = new Date(sorted[sorted.length - 1].date + 'T12:00:00');
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(last);
    end.setDate(end.getDate() + (6 - end.getDay()));
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

  const prevWeeksLengthRef = useRef(0);
  const loadingMoreRef = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prevLen = prevWeeksLengthRef.current;
    const newLen = weeks.length;
    prevWeeksLengthRef.current = newLen;
    loadingMoreRef.current = false;
    if (prevLen === 0) {
      el.scrollLeft = el.scrollWidth;
    } else if (newLen > prevLen) {
      el.scrollLeft += (newLen - prevLen) * TOTAL;
    }
  }, [weeks]);

  useEffect(() => {
    if (!scrollToEnd) return;
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [scrollToEnd]);

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
      className="flex"
      style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'var(--on-surface-variant)' }}
    >
      <div className="shrink-0" style={{ width: 32, paddingTop: 20 }}>
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            style={{
              height: CELL, marginBottom: i < 6 ? GAP : 0,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4,
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      >
        <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 20, marginBottom: 4 }}>
            {weeks.map((week, wi) => {
              const firstDay = week.find(d => d !== null);
              const prevFirstDay = wi > 0 ? weeks[wi - 1].find(d => d !== null) : null;
              const isNewMonth = firstDay && (!prevFirstDay || firstDay.slice(5, 7) !== prevFirstDay.slice(5, 7));
              return (
                <div key={wi} style={{ width: TOTAL, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {isNewMonth && firstDay ? monthLabel(firstDay) : ''}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex' }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ marginRight: GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={cellClass(day)}
                    style={{
                      width: CELL, height: CELL, marginBottom: di < 6 ? GAP : 0,
                      borderRadius: 2, cursor: day ? 'pointer' : 'default', opacity: day ? 1 : 0,
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

function ProjectFilter({
  value,
  projects,
  onChange,
}: {
  value: string | null;
  projects: Project[];
  onChange: (id: string | null) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const selectedLabel = value
    ? (projects.find(p => p.id === value)?.name ?? t('stats.allProjects'))
    : t('stats.allProjects');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-xl border border-outline bg-surface text-on-surface px-3 py-2.5 text-sm active:opacity-80 transition-opacity duration-100"
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="text-on-surface-variant text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-10 left-0 right-0 top-[calc(100%+4px)] bg-surface rounded-xl border border-outline shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn('px-4 py-3 text-sm border-b border-outline/20 cursor-pointer', value === null ? 'bg-primary text-on-primary' : 'text-on-surface')}
          >
            {t('stats.allProjects')}
          </div>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={cn('px-4 py-3 text-sm border-b border-outline/20 last:border-0 cursor-pointer', value === p.id ? 'bg-primary text-on-primary' : 'text-on-surface')}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DatePicker + DateFilterButton ─────────────────────────────────────────────

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DatePicker({
  value,
  onConfirm,
  onCancel,
}: {
  value: string | null;
  onConfirm: (date: string) => void;
  onCancel: () => void;
}): React.ReactElement {
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
      grid.push(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
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

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long' });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-6" onPointerDown={onCancel}>
      <div className="bg-surface rounded-2xl p-4 w-full max-w-sm shadow-xl" onPointerDown={e => e.stopPropagation()}>
        <div className="bg-surface-variant rounded-xl p-3 mb-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setViewYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20">◀</button>
              <span className="w-[3.25rem] text-center text-sm font-semibold text-on-surface tabular-nums">{viewYear}</span>
              <button type="button" onClick={() => setViewYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20">▶</button>
            </div>
            <div className="w-px h-5 bg-outline/30 shrink-0" />
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20">◀</button>
              <span className="w-24 text-center text-sm font-medium text-on-surface-variant">{monthName}</span>
              <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant text-[11px] active:bg-outline/20">▶</button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_INITIALS.map((d, i) => (
              <div key={i} className="h-9 flex items-center justify-center text-xs font-medium text-on-surface-variant">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <div key={i} className="h-9 flex items-center justify-center">
                {day && (
                  <button
                    type="button"
                    onClick={() => setSelected(day)}
                    className={cn('w-9 h-9 rounded-full text-sm transition-colors',
                      selected === day ? 'bg-primary text-on-primary font-medium'
                        : day === todayStr ? 'border border-primary text-primary'
                        : 'text-on-surface active:bg-outline/20'
                    )}
                  >
                    {parseInt(day.slice(8))}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="border border-outline text-primary bg-transparent rounded-xl h-10 px-5 text-sm active:opacity-80 transition-opacity duration-100">{t('btn.cancel')}</button>
          <button type="button" onClick={() => onConfirm(selected)} className="bg-primary text-on-primary rounded-xl h-10 px-5 text-sm active:opacity-80 transition-opacity duration-100">{t('btn.ok')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DateFilterButton({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
}): React.ReactElement {
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
          'shrink-0 flex items-center rounded-xl border px-3 py-2.5 text-sm whitespace-nowrap active:opacity-80 transition-opacity duration-100',
          value ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline bg-surface text-on-surface-variant',
        )}
      >
        {label}
      </button>
      {open && (
        <DatePicker value={value} onConfirm={date => { onChange(date); setOpen(false); }} onCancel={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

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
  const handleLoadMore = useCallback(() => setDaysToLoad(d => Math.min(d + 365, MAX_HISTORY_DAYS)), []);

  const totalCount = getTotalSessionCount();
  const totalMinutes = getTotalMinutes();
  const streak = getCurrentStreak();
  const dailyActivity = getDailyActivity(daysToLoad);
  const heatmapValues = dailyActivity.map(d => ({ date: d.date, count: d.count }));

  const daySessionsForPanel = useMemo(
    () => selectedDay ? sessions.filter(s => toDateString(s.startedAt) === selectedDay) : [],
    [sessions, selectedDay],
  );

  const dayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="flex h-full">
      {/* Left: stats + heatmap */}
      <div className="flex w-[55%] flex-col gap-5 border-r border-outline/20 overflow-y-auto px-5 py-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={totalCount} label={t('stats.sessions')} prefix="" />
          <StatTile value={totalMinutes} label={t('stats.focused')} isMinutes />
          <StatTile value={streak} label={t('stats.dayStreak')} prefix={streak > 0 ? '🔥' : undefined} />
        </div>

        {/* Heatmap */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-on-surface-variant">{t('stats.focusLog')}</p>
            <button onClick={() => setScrollToEnd(n => n + 1)} className="text-xs font-medium text-primary active:opacity-70">
              {t('stats.today')}
            </button>
          </div>
          <ActivityHeatmap
            values={heatmapValues}
            scrollToEnd={scrollToEnd}
            onLoadMore={handleLoadMore}
            isFullyLoaded={isFullyLoaded}
            onDayClick={setSelectedDay}
          />
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
      </div>

      {/* Right: day detail panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedDay ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-outline/20">
              <p className="text-sm font-medium text-on-surface">{dayLabel}</p>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-on-surface-variant active:opacity-70 px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {daySessionsForPanel.length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-4">{t('stats.noSessionsDay')}</p>
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
                    onDeleteGroup={() => { for (const s of item.sessions) void deleteSession(s.id); setSwipeResetToken(k => k + 1); }}
                    onDeleteSession={s => { void deleteSession(s.id); setSwipeResetToken(k => k + 1); }}
                    resetToken={swipeResetToken}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-on-surface-variant">{t('stats.clickDayHint') || 'Click a day on the heatmap'}</p>
          </div>
        )}
      </div>

      <EditSessionSheet session={editSession} onClose={() => setEditSession(null)} baseZIndex={200} />
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

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

  const loadMore = useCallback(() => setVisibleCount(c => c + PAGE_SIZE), []);

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
    <div className="flex h-full">
      {/* Left: filter sidebar */}
      <div className="flex w-56 shrink-0 flex-col gap-3 border-r border-outline/20 px-4 py-4">
        <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Filters</p>
        <ProjectFilter
          value={filterProjectId}
          projects={activeProjects}
          onChange={id => { setFilterProjectId(id); setVisibleCount(PAGE_SIZE); }}
        />
        <DateFilterButton
          value={filterDate}
          onChange={date => { setFilterDate(date); setVisibleCount(PAGE_SIZE); }}
        />
        <button
          type="button"
          onClick={() => { setFilterProjectId(null); setFilterDate(null); setVisibleCount(PAGE_SIZE); }}
          disabled={!filterProjectId && !filterDate}
          className="rounded-xl border border-outline bg-surface text-on-surface-variant px-3 py-2.5 text-sm text-left transition-opacity duration-100 active:opacity-70 disabled:opacity-30"
        >
          {t('stats.resetFilters')}
        </button>
      </div>

      {/* Right: session list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredSessions.length === 0 && (
          filterProjectId || filterDate
            ? <EmptyState title={t('stats.noSessionsFound')} />
            : <EmptyState title={t('stats.noActivity')} />
        )}

        <div className="flex flex-col gap-4">
          {grouped.map(([date, dateSessions]) => (
            <div key={date} className="flex flex-col gap-2">
              <DateDivider dateStr={date} />
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
                    onDeleteGroup={() => { for (const s of item.sessions) void deleteSession(s.id); setSwipeResetToken(k => k + 1); }}
                    onDeleteSession={s => { void deleteSession(s.id); setSwipeResetToken(k => k + 1); }}
                    resetToken={swipeResetToken}
                  />
                );
              })}
            </div>
          ))}
          {visibleCount < filteredSessions.length && <div ref={sentinelRef} className="h-4" />}
        </div>

        <EditSessionSheet session={editSession} onClose={() => setEditSession(null)} baseZIndex={200} />
        {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

type ActiveView = 'overview' | 'history';

export function LandscapeDashboard(): React.ReactElement {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ActiveView>('overview');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-outline/20 px-5 py-4">
        <h1 className="text-lg font-semibold text-on-surface shrink-0">{t('page.activity')}</h1>
        <div className="flex h-7 gap-1 rounded-xl bg-surface-variant p-1">
          {(['overview', 'history'] as const).map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={cn(
                'h-full px-3 text-xs font-medium rounded-lg transition-colors duration-150',
                activeView === v
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant',
              )}
            >
              {v === 'overview' ? t('stats.overview') : t('stats.history')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'overview' ? <OverviewTab /> : <HistoryTab />}
      </div>
    </div>
  );
}
