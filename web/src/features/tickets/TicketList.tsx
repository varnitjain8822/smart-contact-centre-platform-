import type { TicketSummary } from '../../lib/types';
import { TicketCard } from './TicketCard';

export function TicketList({ tickets, now }: { tickets: TicketSummary[]; now: number }) {
  return (
    <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
      {tickets.map((t, i) => (
        <li key={t.number} className="arrive" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
          <TicketCard t={t} now={now} />
        </li>
      ))}
    </ul>
  );
}
