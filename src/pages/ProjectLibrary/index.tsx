import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
import { PageHeader } from '@/components/layout/PageHeader';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { SortableProjectCard } from './components/SortableProjectCard';
import { ProjectCard } from './components/ProjectCard';
import { ProjectForm } from './components/ProjectForm';
import { StartSessionSheet } from './components/StartSessionSheet';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import type { Project, LibrarySort } from '@/types';

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

export function ProjectLibrary(): React.ReactElement {
  const location = useLocation();
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

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [startProject, setStartProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [sortMode, setSortMode] = useState<LibrarySort>('custom');
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    const state = location.state as { openAddSheet?: boolean } | null;
    if (state?.openAddSheet) {
      setAddSheetOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

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
    if (customOrderIds.length === 0) {
      void setCustomOrder(activeProjects.map(p => p.id));
    }
    setIsReordering(true);
  }

  function handleExitReorder(): void {
    setIsReordering(false);
  }

  async function handleAdd(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>,
  ): Promise<void> {
    await addProject({ ...data, isArchived: false });
    setAddSheetOpen(false);
  }

  async function handleEdit(
    data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>,
  ): Promise<void> {
    if (!editProject) return;
    await updateProject(editProject.id, data);
    setEditProject(null);
  }

  async function handleArchive(id: string): Promise<void> {
    await archiveProject(id);
  }

  async function handleUnarchive(id: string): Promise<void> {
    await unarchiveProject(id);
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteProject(id);
  }

  function handleCycleSort(): void {
    setSortMode(current => {
      const idx = SORT_CYCLE.indexOf(current);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  }

  const hasNoProjects = projects.length === 0;
  const allArchived = activeProjects.length === 0 && archivedProjects.length > 0;

  return (
    <>
      {/* Dim overlay — covers header, FAB, BottomNav */}
      {isReordering && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
          onClick={handleExitReorder}
          aria-hidden
        />
      )}

      <div className="flex flex-col h-full">
        <PageHeader title={t('page.library')} />

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {hasNoProjects && (
            <EmptyState
              title={t('library.noProjects')}
              subtitle={t('library.noProjectsSub')}
              cta={{ label: t('library.addFirst'), onClick: () => setAddSheetOpen(true) }}
            />
          )}

          {allArchived && (
            <p className="text-sm text-on-surface-variant text-center py-4">
              {t('library.allArchived')}
            </p>
          )}

          {/* Sort controls */}
          {activeProjects.length > 0 && (
            <div className="flex items-center justify-between">
              {isReordering ? (
                <button
                  onClick={handleExitReorder}
                  aria-label={t('btn.done')}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-primary text-on-primary text-xs font-medium active:opacity-80 transition-opacity duration-100"
                >
                  {t('btn.done')}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleEnterReorder}
                    aria-label={t('library.customOrder')}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-outline text-on-surface-variant bg-transparent text-xs font-medium active:opacity-80 transition-opacity duration-100"
                  >
                    <GripVertical className="w-3.5 h-3.5" aria-hidden />
                    {t('library.customOrder')}
                  </button>
                  <button
                    onClick={handleCycleSort}
                    aria-label={`Sort: ${SORT_LABELS[sortMode]}`}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-outline text-on-surface-variant bg-transparent text-xs font-medium active:opacity-80 transition-opacity duration-100"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                    {SORT_LABELS[sortMode]}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Active projects — wrapped in DnD context, floats above overlay */}
          <div className={isReordering ? 'relative z-50 flex flex-col gap-3' : 'flex flex-col gap-3'}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeProjects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {activeProjects.map(project => (
                  <SortableProjectCard
                    key={project.id}
                    project={project}
                    reorderMode={isReordering}
                    totalMinutes={projectTotalMinutes.get(project.id) ?? 0}
                    onStart={setStartProject}
                    onEdit={setEditProject}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Archived section toggle */}
          {archivedProjects.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <Button
                variant="outlined"
                onClick={() => setShowArchived(v => !v)}
                className="w-full"
              >
                {showArchived
                  ? t('library.hideArchived', { count: archivedProjects.length })
                  : t('library.showArchived', { count: archivedProjects.length })}
              </Button>

              {showArchived &&
                archivedProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    totalMinutes={projectTotalMinutes.get(project.id) ?? 0}
                    onStart={setStartProject}
                    onEdit={setEditProject}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB — hidden during reorder */}
      <button
        onClick={() => setAddSheetOpen(true)}
        className={`fixed bottom-[10vh] right-4 z-30 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center text-2xl leading-none active:opacity-80 transition-opacity duration-100 ${isReordering ? 'hidden' : ''}`}
        aria-label={t('library.addProject')}
      >
        +
      </button>

      {/* Sheets — unmounted during reorder to eliminate z-index conflicts */}
      {!isReordering && (
        <>
          <BottomSheet
            isOpen={addSheetOpen}
            onClose={() => setAddSheetOpen(false)}
            title={t('library.newProject')}
            height="92dvh"
          >
            <ProjectForm
              onSave={data => void handleAdd(data)}
              onCancel={() => setAddSheetOpen(false)}
            />
          </BottomSheet>

          <BottomSheet
            isOpen={!!editProject}
            onClose={() => setEditProject(null)}
            title={t('library.editProject')}
            height="92dvh"
          >
            {editProject && (
              <ProjectForm
                defaultValues={{
                  name: editProject.name,
                  color: editProject.color,
                  estimatedDurationMinutes: editProject.estimatedDurationMinutes,
                  notes: editProject.notes,
                }}
                onSave={data => void handleEdit(data)}
                onCancel={() => setEditProject(null)}
              />
            )}
          </BottomSheet>

          <StartSessionSheet
            project={startProject}
            onClose={() => setStartProject(null)}
            onUnarchive={id => void handleUnarchive(id)}
          />
        </>
      )}
    </>
  );
}
