import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Wire = { id: string; 'aria-invalid': boolean | undefined; 'aria-describedby': string | undefined };

/** Label + control + hint/error, wired with aria-describedby / aria-invalid. */
export function Field({ label, error, hint, optional, children }: {
  label: string; error?: string; hint?: ReactNode; optional?: boolean; children(p: Wire): ReactNode;
}) {
  const { t } = useTranslation();
  const id = useId();
  const desc = [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label} {optional && <span className="font-normal text-muted">{t('common.optional')}</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': desc })}
      {hint && <div id={`${id}-h`} className="text-sm text-muted">{hint}</div>}
      {error && <p id={`${id}-e`} className="text-sm font-medium text-bad">{error}</p>}
    </div>
  );
}
