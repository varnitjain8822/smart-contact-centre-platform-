import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';

/**
 * v2: icon sits inside an SLA-style ring (the product's signal motif). `compact` for in-card use;
 * `as="h1"` when the empty state *is* the page.
 */
export function EmptyState({ icon, title, children, actions, compact, as: H = 'h2' }: {
  icon?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode; compact?: boolean; as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'justify-center rounded-md border border-line bg-surface px-6 py-12 shadow-card sm:py-14'}`}>
      {icon && (
        <div className={`relative mb-4 grid place-items-center rounded-full bg-surface-2 text-ink-2 ${compact ? 'size-12' : 'size-16'}`}>
          <svg aria-hidden viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90 text-accent">
            <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="60 189" />
          </svg>
          {icon}
        </div>
      )}
      <H className={compact ? 'text-lg font-semibold' : 'text-xl font-semibold'}>{title}</H>
      {children && <div className="mt-2 max-w-sm text-ink-2">{children}</div>}
      {actions && <div className="mt-6 flex w-full flex-col items-center gap-3">{actions}</div>}
    </div>
  );
}

/** Inline error for failed queries (lld-frontend §15). */
export function RetryBlock({ onRetry, text }: { onRetry(): void; text?: string }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bad/30 bg-bad/5 px-4 py-3">
      <p className="font-medium text-ink">{text ?? t('common.loadFailed')} <span className="text-ink-2">{t('common.checkConnection')}</span></p>
      <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-2">
        <RotateCw aria-hidden size={15} /> {t('common.retry')}
      </button>
    </div>
  );
}
