import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import type { Project } from '@/types';

interface Props {
  project: Project;
  reorderMode: boolean;
  onStart: (p: Project) => void;
  onEdit: (p: Project) => void;
  onArchive: (id: string) => Promise<void>;
  onUnarchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SortableProjectCard({ project, reorderMode, ...cardProps }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: !reorderMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${reorderMode ? 'pl-10' : ''}`}>
      {reorderMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-10 touch-none cursor-grab active:cursor-grabbing text-on-surface-variant"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      <ProjectCard project={project} reorderMode={reorderMode} {...cardProps} />
    </div>
  );
}
