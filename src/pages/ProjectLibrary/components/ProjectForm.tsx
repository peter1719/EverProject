import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ColorPicker } from './ColorPicker';
import { DrumPicker } from '@/components/shared/DrumPicker';
import { cn } from '@/lib/utils';
import { DURATION_OPTIONS, MAX_NOTES_LENGTH, MAX_PROJECT_NAME_LENGTH } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import type { Project, ProjectColor } from '@/types';

const projectSchema = z.object({
  name: z.string().min(1, 'nameRequired').max(MAX_PROJECT_NAME_LENGTH, 'nameMax'),
  color: z.custom<ProjectColor>(v => typeof v === 'string' && v.length > 0, 'colorRequired'),
  estimatedDurationMinutes: z.number().min(1, 'durationRequired'),
  projectDurationMinutes: z.number().min(0),
  notes: z.string().max(MAX_NOTES_LENGTH, 'notesMax'),
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
  const { t } = useTranslation();

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
      projectDurationMinutes: defaultValues?.projectDurationMinutes ?? 180,
      notes: defaultValues?.notes ?? '',
    },
  });

  const notesValue = useWatch({ control, name: 'notes' });
  const projectDurValue = useWatch({ control, name: 'projectDurationMinutes' });

  function getErrorMsg(key: string | undefined): string | null {
    if (!key) return null;
    if (key === 'nameRequired') return t('form.error.nameRequired');
    if (key === 'nameMax') return t('form.error.nameMax', { max: MAX_PROJECT_NAME_LENGTH });
    if (key === 'colorRequired') return t('form.error.colorRequired');
    if (key === 'durationRequired') return t('form.error.durationRequired');
    if (key === 'notesMax') return t('form.error.notesMax', { max: MAX_NOTES_LENGTH });
    return key;
  }

  function onSubmit(data: ProjectFormValues): void {
    onSave({
      name: data.name,
      color: data.color as ProjectColor,
      estimatedDurationMinutes: data.estimatedDurationMinutes,
      projectDurationMinutes: data.projectDurationMinutes,
      notes: data.notes,
    });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
      {/* Name */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-on-surface-variant">{t('form.projectName')}</label>
        <input
          {...register('name')}
          maxLength={MAX_PROJECT_NAME_LENGTH}
          className="rounded-xl border border-outline bg-surface text-on-surface px-4 py-3 focus:border-primary focus:outline-none"
          placeholder={t('form.projectNamePlaceholder')}
        />
        {errors.name && (
          <p className="text-sm text-error">{getErrorMsg(errors.name.message)}</p>
        )}
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-on-surface-variant">{t('form.color')}</label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <ColorPicker value={field.value as ProjectColor} onChange={field.onChange} />
          )}
        />
        {errors.color && (
          <p className="text-sm text-error">{getErrorMsg(errors.color.message as string)}</p>
        )}
      </div>

      {/* Session Duration */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-on-surface-variant">{t('form.sessionDuration')}</label>
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
            {getErrorMsg(errors.estimatedDurationMinutes.message)}
          </p>
        )}
      </div>

      {/* Project Duration */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-on-surface-variant">
            {t('form.projectDuration')}
          </label>
          {projectDurValue === 0 && (
            <span className="text-xs text-on-surface-variant/60">
              {t('form.projectDurationNoLimit')}
            </span>
          )}
        </div>
        <Controller
          name="projectDurationMinutes"
          control={control}
          render={({ field }) => {
            const d = Math.floor(field.value / 1440);
            const h = Math.floor((field.value % 1440) / 60);
            return (
              <DrumPicker
                days={d}
                hours={h}
                onChange={(days, hours) =>
                  field.onChange(days === 0 && hours === 0 ? 0 : days * 1440 + hours * 60)
                }
              />
            );
          }}
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <label className="text-sm font-medium text-on-surface-variant">{t('form.notes')}</label>
          <span className="text-xs text-on-surface-variant">
            {notesValue?.length ?? 0}/{MAX_NOTES_LENGTH}
          </span>
        </div>
        <textarea
          {...register('notes')}
          maxLength={MAX_NOTES_LENGTH}
          rows={3}
          className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
          placeholder={t('form.notesPlaceholder')}
        />
        {errors.notes && (
          <p className="text-sm text-error">{getErrorMsg(errors.notes.message)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-2">
        <button
          type="submit"
          className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100"
        >
          {t('form.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-12 rounded-xl border border-outline text-on-surface-variant bg-transparent font-medium active:opacity-80 transition-opacity duration-100"
        >
          {t('form.cancel')}
        </button>
      </div>
    </form>
  );
}
