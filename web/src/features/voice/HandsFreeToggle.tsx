import { useTranslation } from 'react-i18next';
import { Headphones } from 'lucide-react';

export interface HandsFreeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function HandsFreeToggle({ enabled, onToggle, disabled = false }: HandsFreeToggleProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      disabled={disabled}
      aria-pressed={enabled}
      title={t('voice.handsFreeHelp')}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold transition-colors ${
        enabled
          ? 'bg-ai-soft text-ai border border-ai/30'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink border border-transparent'
      } disabled:opacity-40`}
    >
      <Headphones aria-hidden size={15} />
      <span>{t('voice.handsFreeToggle')}</span>
      {enabled && (
        <span className="size-2 rounded-full bg-ai animate-pulse" aria-hidden />
      )}
    </button>
  );
}
