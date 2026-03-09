import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ColorPicker } from './ColorPicker';
import { cn } from '@/lib/utils';
import { DURATION_OPTIONS, MAX_NOTES_LENGTH, MAX_PROJECT_NAME_LENGTH } from '@/lib/constants';
import type { Project, ProjectColor } from '@/types';

const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Name required')
    .max(MAX_PROJECT_NAME_LENGTH, `Max ${MAX_PROJECT_NAME_LENGTH} chars`),
  color: z.custom<ProjectColor>(v => typeof v === 'string' && v.length > 0, 'Pick a color'),
  estimatedDurationMinutes: z.number().min(1, 'Pick a duration'),
  notes: z.string().max(MAX_NOTES_LENGTH, `Max ${MAX_NOTES_LENGTH} chars`),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  readonly defaultValues?: Partial<ProjectFormValues>;
  readonly onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => void;
  readonly onCancel: () => void;
}

export function ProjectForm({
  defaultValues,
  onSave,
  onCancel,
}: ProjectFormProps): React.ReactElement {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      color: defaultValues?.color ?? 'indigo',
      estimatedDurationMinutes: defaultValues?.estimatedDurationMinutes ?? 30,
      notes: defaultValues?.notes ?? '',
    },
  });

  const notesValue = useWatch({ control, name: 'notes' });

  function onSubmit(data: ProjectFormValues): void {
    onSave({
      name: data.name,
      color: data.color as ProjectColor,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
      notes: data.notes,
    });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
      {/* Name */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-on-surface-variant">Project name</label>
        <input
          {...register('name')}
          maxLength={MAX_PROJECT_NAME_LENGTH}
          className="rounded-xl border border-outline bg-surface text-on-surface px-4 py-3 focus:border-primary focus:outline-none"
          placeholder="My project"
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-on-surface-variant">Color</label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <ColorPicker value={field.value as ProjectColor} onChange={field.onChange} />
          )}
        />
        {errors.color && (
          <p className="text-sm text-error">{errors.color.message as string}</p>
        )}
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-on-surface-variant">Est. duration</label>
        <Controller
          name="estimatedDurationMinutes"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => field.onChange(mins)}
                  className={cn(
                    'h-10 w-full rounded-xl text-sm font-medium active:opacity-80 transition-opacity duration-100',
                    field.value === mins
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline text-on-surface-variant bg-transparent',
                  )}
                >
                  {mins >= 999 ? '>180' : mins}
                </button>
              ))}
            </div>
          )}
        />
        {errors.estimatedDurationMinutes && (
          <p className="text-sm text-error">
            {errors.estimatedDurationMinutes.message}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <label className="text-sm font-medium text-on-surface-variant">Notes</label>
          <span className="text-xs text-on-surface-variant">
            {notesValue?.length ?? 0}/{MAX_NOTES_LENGTH}
          </span>
        </div>
        <textarea
          {...register('notes')}
          maxLength={MAX_NOTES_LENGTH}
          rows={3}
          className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
          placeholder="Optional notes..."
        />
        {errors.notes && (
          <p className="text-sm text-error">{errors.notes.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-2">
        <button
          type="submit"
          className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-12 rounded-xl border border-outline text-on-surface-variant bg-transparent font-medium active:opacity-80 transition-opacity duration-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
