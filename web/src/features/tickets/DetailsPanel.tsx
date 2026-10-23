import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TicketDetail } from '../../lib/types';
import { categoryLabel, fullDate, priorityLabel } from '../../lib/format';
import { SlaChip } from './SlaChip';
import { StatusTimeline } from './StatusTimeline';

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>;
}

/** Desktop side column; on smaller screens TicketPage wraps it in <details>. */
export function DetailsPanel({ t, now }: { t: TicketDetail; now: number }) {
  const { t: tr } = useTranslation();
  const due = t.sla.activeDueAt;
  const id = useId();
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${id}s`} className="rounded-md border border-line bg-surface p-4 shadow-card">
        <h2 id={`${id}s`} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {tr(!due ? 'details.serviceLevel' : t.sla.firstResponseAt ? 'details.resolutionTarget' : 'details.firstResponseTarget')}
        </h2>
        <div className="mt-2"><SlaChip sla={t.sla} now={now} start={t.createdAt} size="md" /></div>
        {due && <p className="mt-1 text-sm text-ink-2">{tr('details.due', { date: fullDate(due) })}</p>}
      </section>
      <dl className="divide-y divide-line text-sm">
        <Row k={tr('details.ticket')} v={t.number} />
        <Row k={tr('details.priority')} v={priorityLabel(t.priority)} />
        <Row k={tr('details.topic')} v={categoryLabel(t.category)} />
        <Row k={tr('details.opened')} v={fullDate(t.createdAt)} />
      </dl>
      <section aria-labelledby={`${id}h`}>
        <h2 id={`${id}h`} className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{tr('details.history')}</h2>
        <StatusTimeline events={t.statusHistory} />
      </section>
    </div>
  );
}
