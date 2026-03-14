import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface PageHeaderProps {
  readonly title: string;
  readonly showBack?: boolean;
  readonly backPath?: string;
  readonly rightSlot?: React.ReactNode;
  readonly className?: string;
  readonly onTitlePress?: () => void;
}

export function PageHeader({
  title,
  showBack = false,
  backPath,
  rightSlot,
  className,
  onTitlePress,
}: PageHeaderProps): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleBack(): void {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  }

  return (
    <header
      className={cn(
        'flex items-stretch border-b border-outline/30 bg-surface',
        className,
      )}
    >
      {/* Back button */}
      {showBack && (
        <button
          onClick={handleBack}
          className="shrink-0 flex items-center px-6 rounded-lg border border-outline/50 text-on-surface-variant text-sm mx-2 my-3 active:opacity-80 transition-opacity duration-100"
        >
          {t('btn.back')}
        </button>
      )}

      {/* Title */}
      <h1
        onClick={onTitlePress}
        className={cn(
          'flex flex-1 items-center px-4 py-6 font-display text-2xl font-bold text-on-surface leading-tight',
          onTitlePress && 'cursor-pointer select-none active:opacity-70 transition-opacity duration-100',
        )}
      >
        {title}
      </h1>

      {/* rightSlot */}
      {rightSlot}
    </header>
  );
}
