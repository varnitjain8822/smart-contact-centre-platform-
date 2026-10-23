import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TicketSummary } from '../../lib/types';
import { ago, categoryLabel } from '../../lib/format';
import { PriorityTag } from './PriorityTag';
import { SlaChip } from './SlaChip';
import { StatusPill } from './StatusPill';

/** A paper ticket: number + status up top, a perforated tear line, SLA countdown on the stub. */
export function TicketCard({ t, now }: { t: TicketSummary; now: number }) {
  const { t: tr } = useTranslation();
  return (
    <Link to={`/tickets/${t.number}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface shadow-card transition-[border-color,transform] hover:-translate-y-px hover:border-line-strong">
      <div className="flex-1 p-4 pb-3.5 sm:p-5 sm:pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[15px] font-semibold tracking-tight text-muted tnum">{t.number}</span>
          <StatusPill status={t.status} />
        </div>
        <h3 className="mt-2.5 line-clamp-2 font-text text-[17px] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
          {t.subject}
        </h3>
        <p className="mt-1 text-sm text-muted">{categoryLabel(t.category)} · {tr('ticket.updated', { ago: ago(t.lastMessageAt, now) })}
          {t.delivery !== 'synced' && <span className="font-semibold text-info"> · {tr(t.delivery === 'queued' ? 'delivery.queued' : 'delivery.delayed')}</span>}</p>
      </div>
      <div aria-hidden className="relative mx-4 border-t-2 border-dashed border-line sm:mx-5">
        <span className="absolute -left-[25px] -top-[9px] size-4 rounded-full border border-line bg-bg sm:-left-[29px]" />
        <span className="absolute -right-[25px] -top-[9px] size-4 rounded-full border border-line bg-bg sm:-right-[29px]" />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <SlaChip sla={t.sla} now={now} start={t.createdAt} />
        <PriorityTag priority={t.priority} />
      </div>
    </Link>
  );
}
