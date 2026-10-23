import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useMe } from '../features/auth/hooks';
import { buttonClass } from '../ui/Button';
import { PageTitle } from '../ui/PageTitle';
import { SlaRing } from '../ui/SlaRing';

/** A ticket slip that never got issued: number up top, perforation, a stub with the way back. */
export function NotFoundPanel({ code = '404', title, body, back }: { code?: string; title: string; body: string; back: { to: string; label: string } }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto mt-4 max-w-md md:mt-10">
      <div className="arrive relative overflow-hidden rounded-md border border-line bg-surface shadow-card md:-rotate-[1.2deg]">
        <div className="p-6 pb-5 sm:p-8 sm:pb-6">
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-[15px] font-semibold tracking-tight text-muted tnum">{code}</span>
            <span className="inline-flex items-center rounded-pill bg-surface-2 px-2.5 py-1 text-sm font-medium text-ink-2">{t('notFound.badge')}</span>
          </div>
          <PageTitle title={title} className="mt-4 text-2xl sm:text-[28px]" />
          <p className="mt-2 text-ink-2">{body}</p>
        </div>
        <div aria-hidden className="relative mx-6 border-t-2 border-dashed border-line sm:mx-8">
          <span className="absolute -left-[33px] -top-[9px] size-4 rounded-full border border-line bg-bg sm:-left-[41px]" />
          <span className="absolute -right-[33px] -top-[9px] size-4 rounded-full border border-line bg-bg sm:-right-[41px]" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted"><SlaRing fraction={0} tone="bad" /> {t('notFound.stub')}</span>
          <Link to={back.to} className={buttonClass('primary', '!px-4')}><ArrowLeft aria-hidden size={17} /> {back.label}</Link>
        </div>
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  const { t } = useTranslation();
  const signedIn = !!useMe().data;
  return <NotFoundPanel title={t('notFound.title')} body={t('notFound.body')}
    back={signedIn ? { to: '/', label: t('notFound.toTickets') } : { to: '/help', label: t('notFound.toHelp') }} />;
}
