import type { Sla } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { slaView } from '../../lib/format';
import { SlaRing } from '../../ui/SlaRing';

const TEXT = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', done: 'text-ok' };

/** Ring + countdown. `start` = ticket createdAt (window start); one `now` per page ticks every 30 s. */
export function SlaChip({ sla, now, start, size = 'sm' }: { sla: Sla; now: number; start: string; size?: 'sm' | 'md' }) {
  useTranslation(); // re-render on language change
  const v = slaView(sla, now, start);
  return (
    <span role="img" aria-label={v.label}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold tnum ${TEXT[v.tone]} ${size === 'md' ? 'text-base' : 'text-sm'}`}>
      <SlaRing fraction={v.fraction} tone={v.tone} size={size === 'md' ? 28 : 20} />
      {v.text}
    </span>
  );
}
