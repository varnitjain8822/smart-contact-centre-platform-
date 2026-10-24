import { useTranslation } from 'react-i18next';

/** v4: on every page of a demo portal (records are fabricated), with a way back to the company picker. */
export function DemoRibbon() {
  const { t } = useTranslation();
  return (
    <p role="note" className="flex flex-wrap items-center justify-center gap-x-3 px-4 py-1.5 text-center text-sm font-semibold print:hidden"
      style={{ background: 'rgb(var(--brand-ribbon))', color: 'rgb(var(--brand-ribbon-ink))' }}>
      <span>{t('shell.demoData')}</span>
      <a href="/" className="underline underline-offset-4">{t('shell.allPortals')}</a>
    </p>
  );
}
