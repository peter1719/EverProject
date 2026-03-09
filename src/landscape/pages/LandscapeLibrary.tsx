import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableProjectCard } from '@/pages/ProjectLibrary/components/SortableProjectCard';
import { ProjectCard } from '@/pages/ProjectLibrary/components/ProjectCard';
import { ProjectForm } from '@/pages/ProjectLibrary/components/ProjectForm';
import { ColorFilterDropdown } from '@/pages/ProjectLibrary/components/ColorFilterDropdown';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { DurationSelector } from '@/components/shared/DurationSelector';
import { ProjectNameRow } from '@/components/shared/ProjectNameRow';
import { ProjectDetailPanel } from '@/components/shared/ProjectDetailPanel';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { COLOR_PALETTE, DURATION_OPTIONS } from '@/lib/constants';
import type { Project, LibrarySort, ProjectColor } from '@/types';

const SORT_CYCLE: LibrarySort[] = ['date', 'name', 'custom'];

function applySortMode(
  projects: Project[],
  mode: LibrarySort,
  orderedIds: string[],
): Project[] {
  if (mode === 'name') {
    return [...projects].sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-Hant', { sensitivity: 'base' }),
    );
  }
  if (mode === 'date') {
    return [...projects].sort((a, b) => b.createdAt - a.createdAt);
  }
  if (mode === 'custom') {
    const indexMap = new Map(orderedIds.map((id, i) => [id, i]));
    return [...projects].sort((a, b) => {
      const ai = indexMap.has(a.id) ? indexMap.get(a.id)! : Infinity;
      const bi = indexMap.has(b.id) ? indexMap.get(b.id)! : Infinity;
      return ai - bi;
    });
  }
  return projects;
}

// ── Panel state ───────────────────────────────────────────────────────────────

type PanelMode =
  | { type: 'idle' }
  | { type: 'add' }
  | { type: 'detail'; project: Project }
  | { type: 'edit'; project: Project }
  | { type: 'start'; project: Project };

// ── Inline start session panel ────────────────────────────────────────────────

function StartPanel({
  project,
  onClose,
  onUnarchive,
}: {
  project: Project;
  onClose: () => void;
  onUnarchive: (id: string) => void;
}): React.ReactElement {
  const navigate = useNavigate();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);

  const effectiveMinutes = DURATION_OPTIONS.includes(
    selectedMinutes as (typeof DURATION_OPTIONS)[number],
  )
    ? selectedMinutes
    : 30;

  function handleStart(): void {
    navigate('/timer', {
      state: { projectIds: [project.id], totalMinutes: effectiveMinutes, origin: '/library' },
    });
    onClose();
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectNameRow color={project.color} name={project.name} dotSize={16} gap={3} textSize="base" />

      {project.isArchived && (
        <div className="flex items-center justify-between rounded-xl bg-primary-container px-3 py-2">
          <span className="text-sm font-medium text-on-primary-container">Archived</span>
          <button
            onClick={() => { onUnarchive(project.id); onClose(); }}
            className="h-8 px-3 rounded-lg bg-primary text-on-primary text-sm font-medium active:opacity-80 transition-opacity duration-100"
          >
            Unarchive
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-on-surface-variant">How long?</label>
        <DurationSelector value={effectiveMinutes} onChange={setSelectedMinutes} />
      </div>

      <div className="flex gap-3">
        <Button variant="filled" onClick={handleStart} className="flex-1">▶ Start</Button>
        <Button variant="outlined" onClick={onClose} className="flex-1">Cancel</Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LandscapeLibrary(): React.ReactElement {
  const { t } = useTranslation();

  const SORT_LABELS: Record<LibrarySort, string> = {
    date: t('library.sort.date'),
    name: t('library.sort.name'),
    custom: t('library.sort.custom'),
  };

  const projects = useProjectStore(s => s.projects);
  const addProject = useProjectStore(s => s.addProject);
  const updateProject = useProjectStore(s => s.updateProject);
  const archiveProject = useProjectStore(s => s.archiveProject);
  const unarchiveProject = useProjectStore(s => s.unarchiveProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const getActiveProjects = useProjectStore(s => s.getActiveProjects);
  const sessions = useSessionStore(s => s.sessions);
  const customOrderIds = useSettingsStore(s => s.customOrderIds);
  const setCustomOrder = useSettingsStore(s => s.setCustomOrder);

  const [panel, setPanel] = useState<PanelMode>({ type: 'idle' });
  const [showArchived, setShowArchived] = useState(false);
  const [sortMode, setSortMode] = useState<LibrarySort>('custom');
  const [isReordering, setIsReordering] = useState(false);
  const [colorFilter, setColorFilter] = useState<ProjectColor | null>(null);

  const projectTotalMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.outcome === 'abandoned') continue;
      map.set(s.projectId, (map.get(s.projectId) ?? 0) + s.actualDurationMinutes);
    }
    return map;
  }, [sessions]);

  const activeProjects = applySortMode(getActiveProjects(sessions), sortMode, customOrderIds);
  const archivedProjects = projects.filter(p => p.isArchived);

  const usedColors = useMemo(
    () => COLOR_PALETTE.filter(c => projects.some(p => p.color === c)),
    [projects],
  );

  const filteredActive = colorFilter
    ? activeProjects.filter(p => p.color === colorFilter)
    : activeProjects;
  const filteredArchived = colorFilter
    ? archivedProjects.filter(p => p.color === colorFilter)
    : archivedProjects;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeProjects.findIndex(p => p.id === active.id);
    const newIndex = activeProjects.findIndex(p => p.id === over.id);
    const newOrder = arrayMove(activeProjects, oldIndex, newIndex).map(p => p.id);
    void setCustomOrder(newOrder);
  }

  function handleEnterReorder(): void {
    setSortMode('custom');
    if (customOrderIds.length === 0) void setCustomOrder(activeProjects.map(p => p.id));
    setIsReordering(true);
    setPanel({ type: 'idle' });
  }

  function handleExitReorder(): void {
    setIsReordering(false);
  }

  function handleCycleSort(): void {
    setSortMode(current => {
      const idx = SORT_CYCLE.indexOf(current);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  }

  async function handleAdd(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>,
  ): Promise<void> {
    await addProject({ ...data, isArchived: false });
    setPanel({ type: 'idle' });
  }

  async function handleEdit(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>,
  ): Promise<void> {
    if (panel.type !== 'edit') return;
    await updateProject(panel.project.id, data);
    setPanel({ type: 'idle' });
  }

  const hasNoProjects = projects.length === 0;
  const allArchived = filteredActive.length === 0 && filteredArchived.length > 0;

  // ── Panel content ─────────────────────────────────────────────────────────

  function renderPanel(): React.ReactElement {
    if (panel.type === 'detail') {
      return (
        <ProjectDetailPanel project={panel.project} />
      );
    }

    if (panel.type === 'add') {
      return (
        <>
          <h2 className="text-base font-semibold text-on-surface mb-4">{t('library.newProject')}</h2>
          <ProjectForm
            key="add"
            onSave={data => void handleAdd(data)}
            onCancel={() => setPanel({ type: 'idle' })}
          />
        </>
      );
    }

    if (panel.type === 'edit') {
      return (
        <>
          <h2 className="text-base font-semibold text-on-surface mb-4">{t('library.editProject')}</h2>
          <ProjectForm
            key={panel.project.id}
            defaultValues={{
              name: panel.project.name,
              color: panel.project.color,
              estimatedDurationMinutes: panel.project.estimatedDurationMinutes,
              notes: panel.project.notes,
            }}
            onSave={data => void handleEdit(data)}
            onCancel={() => setPanel({ type: 'idle' })}
          />
        </>
      );
    }

    if (panel.type === 'start') {
      return (
        <>
          <h2 className="text-base font-semibold text-on-surface mb-4">Start session?</h2>
          <StartPanel
            project={panel.project}
            onClose={() => setPanel({ type: 'idle' })}
            onUnarchive={id => void unarchiveProject(id)}
          />
        </>
      );
    }

    // idle
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-on-surface-variant">
          {hasNoProjects ? t('library.noProjectsSub') : 'Select ▶ to start or ✎ to edit'}
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ── Left column: project list ─────────────────────────────────── */}
      <div className="relative flex w-[52%] flex-col border-r border-outline/20">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-outline/20">
          <h1 className="text-lg font-semibold text-on-surface">{t('page.library')}</h1>
        </div>

        {/* Sort controls */}
        {activeProjects.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2 border-b border-outline/10">
            {isReordering ? (
              <button
                onClick={handleExitReorder}
                className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-primary text-on-primary text-xs font-medium active:opacity-80 transition-opacity duration-100"
              >
                {t('btn.done')}
              </button>
            ) : (
              <>
                <button
                  onClick={handleEnterReorder}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-outline text-on-surface-variant bg-transparent text-xs font-medium active:opacity-80 transition-opacity duration-100"
                >
                  <GripVertical className="w-3.5 h-3.5" aria-hidden />
                  {t('library.customOrder')}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCycleSort}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-outline text-on-surface-variant bg-transparent text-xs font-medium active:opacity-80 transition-opacity duration-100"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                    {SORT_LABELS[sortMode]}
                  </button>
                  <ColorFilterDropdown
                    colors={usedColors}
                    value={colorFilter}
                    onChange={setColorFilter}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Project list */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3">
          {hasNoProjects && (
            <EmptyState
              title={t('library.noProjects')}
              subtitle={t('library.noProjectsSub')}
              cta={{ label: t('library.addFirst'), onClick: () => setPanel({ type: 'add' }) }}
            />
          )}

          {allArchived && (
            <p className="text-sm text-on-surface-variant text-center py-4">
              {t('library.allArchived')}
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredActive.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredActive.map(project => (
                <SortableProjectCard
                  key={project.id}
                  project={project}
                  reorderMode={isReordering}
                  totalMinutes={projectTotalMinutes.get(project.id) ?? 0}
                  onStart={p => setPanel({ type: 'start', project: p })}
                  onEdit={p => setPanel({ type: 'edit', project: p })}
                  onArchive={id => archiveProject(id)}
                  onUnarchive={id => unarchiveProject(id)}
                  onDelete={id => deleteProject(id)}
                  onCardClick={p => setPanel({ type: 'detail', project: p })}
                />
              ))}
            </SortableContext>
          </DndContext>

          {filteredArchived.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <Button
                variant="outlined"
                onClick={() => setShowArchived(v => !v)}
                className="w-full"
              >
                {showArchived
                  ? t('library.hideArchived', { count: filteredArchived.length })
                  : t('library.showArchived', { count: filteredArchived.length })}
              </Button>

              {showArchived &&
                filteredArchived.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    totalMinutes={projectTotalMinutes.get(project.id) ?? 0}
                    onStart={p => setPanel({ type: 'start', project: p })}
                    onEdit={p => setPanel({ type: 'edit', project: p })}
                    onArchive={id => void archiveProject(id)}
                    onUnarchive={id => void unarchiveProject(id)}
                    onDelete={id => void deleteProject(id)}
                    onCardClick={p => setPanel({ type: 'detail', project: p })}
                  />
                ))}
            </div>
          )}
        </div>

        {/* FAB — bottom right of left column */}
        {!isReordering && (
          <button
            onClick={() => setPanel({ type: 'add' })}
            aria-label={t('library.addProject')}
            className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary text-on-primary text-3xl leading-none flex items-center justify-center shadow-lg active:opacity-80 transition-opacity duration-100"
          >
            +
          </button>
        )}
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className={`flex flex-1 flex-col overflow-hidden ${panel.type === 'detail' ? '' : 'overflow-y-auto p-6'}`}>
        {renderPanel()}
      </div>
    </div>
  );
}
