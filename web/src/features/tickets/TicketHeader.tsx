import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, History, MoreHorizontal, Printer } from 'lucide-react';
import { api } from '../../lib/api';
import type { TicketDetail } from '../../lib/types';
import { PageTitle } from '../../ui/PageTitle';
import { Dialog } from '../../ui/Dialog';
import { DropdownMenu } from '../../ui/DropdownMenu';
import { Button } from '../../ui/Button';
import { categoryLabel } from '../../lib/format';
import { PriorityTag } from './PriorityTag';
import { StatusPill } from './StatusPill';
import { StatusTimeline } from './StatusTimeline';

const download = (url: string) => { const a = document.createElement('a'); a.href = url; a.download = ''; document.body.append(a); a.click(); a.remove(); };

export function TicketHeader({ t }: { t: TicketDetail }) {
  const { t: tr } = useTranslation();
  const [history, setHistory] = useState(false);
  return (
    <div>
      <Link to="/tickets" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-ink-2 hover:text-ink print:hidden">
        <ArrowLeft aria-hidden size={16} /> {tr('nav.tickets')}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-base font-semibold tracking-tight text-muted tnum">{t.number}</p>
        <span className="-mt-2 print:hidden">
          <DropdownMenu label={tr('ticket.menu')}
            items={[
              { label: tr('ticket.transcript'), icon: Download, onSelect: () => download(api.transcriptUrl(t.number)) },
              { label: tr('ticket.print'), icon: Printer, onSelect: () => window.print() },
              { label: tr('ticket.history'), icon: History, onSelect: () => setHistory(true) },
            ]}
            trigger={(p) => (
              <button type="button" {...p} aria-label={tr('ticket.menu')}
                className="grid size-11 place-items-center rounded-pill text-ink-2 hover:bg-surface-2 hover:text-ink"><MoreHorizontal aria-hidden size={20} /></button>
            )} />
        </span>
      </div>
      <PageTitle title={`${t.number} ${t.subject}`} className="mt-1 text-2xl leading-tight md:text-[32px]">{t.subject}</PageTitle>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusPill status={t.status} />
        <PriorityTag priority={t.priority} />
        <span className="text-sm text-muted">{categoryLabel(t.category)}</span>
      </div>
      <Dialog sheet open={history} title={tr('details.history')} onClose={() => setHistory(false)}>
        <div className="mt-3"><StatusTimeline events={t.statusHistory} /></div>
        <Button variant="secondary" className="mt-8 w-full" onClick={() => setHistory(false)}>{tr('attach.close')}</Button>
      </Dialog>
    </div>
  );
}
