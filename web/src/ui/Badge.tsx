import type { ReactNode } from 'react';
import type { Tone } from './Pill';

const T: Record<Tone, string> = {
  ai: 'bg-ai-soft text-ai',
  neutral: 'bg-surface-2 text-ink-2',
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  bad: 'bg-bad/10 text-bad',
  info: 'bg-info/10 text-info',
};

/** Small uppercase label ("AI assistant", "New"). */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] ${T[tone]}`}>
      {children}
    </span>
  );
}

/** Numeric count bubble (tabs, bell). Caps at 99+. `label` gives screen readers the meaning. */
export function Count({ n, label, solid }: { n: number; label?: string; solid?: boolean }) {
  return (
    <span aria-label={label} className={`inline-grid h-5 min-w-5 place-items-center rounded-pill px-1.5 text-xs font-bold leading-none tnum
      ${solid ? 'bg-bad text-white' : 'bg-surface-2 text-ink-2'}`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}
