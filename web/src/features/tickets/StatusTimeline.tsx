import type { StatusEvent } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { actorLabel, fullDate, statusLabel } from '../../lib/format';

const DOT = { ai_handling: 'bg-ai', in_progress: 'bg-accent', waiting_on_customer: 'bg-warn', resolved: 'bg-ok' };

export function StatusTimeline({ events }: { events: StatusEvent[] }) {
  useTranslation(); // re-render on language change
  return (
    <ol className="relative ml-1.5 border-l-2 border-line">
      {events.map((e, i) => (
        <li key={i} className="relative pb-4 pl-5 last:pb-0">
          <span aria-hidden className={`absolute -left-[7px] top-1.5 size-3 rounded-full ring-4 ring-bg ${DOT[e.status]}`} />
          <p className="text-[15px] font-semibold text-ink">{statusLabel(e.status)}</p>
          <p className="text-sm text-muted"><time dateTime={e.at}>{fullDate(e.at)}</time> · {actorLabel(e.by)}</p>
        </li>
      ))}
    </ol>
  );
}
