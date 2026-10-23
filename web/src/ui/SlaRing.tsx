import type { SlaTone } from '../lib/format';

const STROKE: Record<SlaTone, string> = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', done: 'text-ok' };

/** Countdown ring: arc = time remaining in the active SLA window. Decorative; the chip carries the text. */
export function SlaRing({ fraction, tone, size = 20 }: { fraction: number; tone: SlaTone; size?: 20 | 28 }) {
  const r = 8, c = 2 * Math.PI * r;
  const f = tone === 'done' ? 1 : tone === 'bad' ? 1 : fraction;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 20 20" className={`shrink-0 ${STROKE[tone]}`}>
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 10 10)" className="transition-[stroke-dasharray] duration-500" />
      {tone === 'done' && <path d="M6.6 10.2l2.2 2.2 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {tone === 'bad' && <path d="M10 6v4.6M10 13.4v.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
      {(tone === 'ok' || tone === 'warn') && <path d="M10 6.5V10l2 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}
