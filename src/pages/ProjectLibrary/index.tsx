import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProjectCard } from './components/ProjectCard';
import { ProjectForm } from './components/ProjectForm';
import { StartSessionSheet } from './components/StartSessionSheet';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import type { Project } from '@/types';

export function ProjectLibrary(): React.ReactElement {
  const location = useLocation();

  const projects = useProjectStore(s => s.projects);
  const addProject = useProjectStore(s => s.addProject);
  const updateProject = useProjectStore(s => s.updateProject);
  const archiveProject = useProjectStore(s => s.archiveProject);
  const unarchiveProject = useProjectStore(s => s.unarchiveProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const getActiveProjects = useProjectStore(s => s.getActiveProjects);

  const sessions = useSessionStore(s => s.sessions);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [startProject, setStartProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const state = location.state as { openAddSheet?: boolean } | null;
    if (state?.openAddSheet) {
      setAddSheetOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const activeProjects = getActiveProjects(sessions);
  const archivedProjects = projects.filter(p => p.isArchived);

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

  const hasNoProjects = projects.length === 0;
  const allArchived = activeProjects.length === 0 && archivedProjects.length > 0;

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader title="My Library" />

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {hasNoProjects && (
            <EmptyState
              title="No projects yet."
              subtitle="Add your first project to get started."
              cta={{ label: '+ Add project', onClick: () => setAddSheetOpen(true) }}
            />
          )}

          {allArchived && (
            <p className="text-sm text-on-surface-variant text-center py-4">
              All projects archived.
            </p>
          )}

          {/* Active projects */}
          {activeProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onStart={setStartProject}
              onEdit={setEditProject}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
            />
          ))}

          {/* Archived section toggle */}
          {archivedProjects.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={() => setShowArchived(v => !v)}
                className="rounded-xl border border-outline/30 bg-surface-variant py-3 text-sm font-medium text-on-surface-variant w-full active:opacity-80 transition-opacity duration-100"
              >
                {showArchived
                  ? `▲ Hide archived (${archivedProjects.length})`
                  : `▼ Show archived (${archivedProjects.length})`}
              </button>

              {showArchived &&
                archivedProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
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

      {/* FAB — Add project */}
      <button
        onClick={() => setAddSheetOpen(true)}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center text-2xl leading-none active:opacity-80 transition-opacity duration-100"
        aria-label="Add project"
      >
        +
      </button>

      {/* Add sheet */}
      <BottomSheet
        isOpen={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        title="New project"
        height="80dvh"
      >
        <ProjectForm
          onSave={data => void handleAdd(data)}
          onCancel={() => setAddSheetOpen(false)}
        />
      </BottomSheet>

      {/* Edit sheet */}
      <BottomSheet
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        title="Edit project"
        height="80dvh"
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

      {/* Start session sheet */}
      <StartSessionSheet
        project={startProject}
        onClose={() => setStartProject(null)}
        onUnarchive={id => void handleUnarchive(id)}
      />
    </>
  );
}
