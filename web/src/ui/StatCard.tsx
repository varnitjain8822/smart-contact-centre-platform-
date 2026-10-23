import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { Tone } from './Pill';
import { Skeleton } from './Skeleton';

const ICON: Record<Tone, string> = {
  ai: 'bg-ai-soft text-ai', accent: 'bg-accent-soft text-accent', ok: 'bg-ok/10 text-ok', warn: 'bg-warn/10 text-warn',
  bad: 'bg-bad/10 text-bad', info: 'bg-info/10 text-info', neutral: 'bg-surface-2 text-ink-2',
};
const BAR: Record<Tone, string> = {
  ai: 'bg-ai', accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', neutral: 'bg-line-strong',
};

/** One metric: label, big tabular number, footnote. With `to` the whole card is a link. */
export function StatCard({ label, value, icon: Icon, tone = 'neutral', hint, to, loading }: {
  label: string; value: ReactNode; icon?: LucideIcon; tone?: Tone; hint?: ReactNode; to?: string; loading?: boolean;
}) {
  const body = (
    <>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${BAR[tone]} opacity-80`} />
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-ink-2">{label}</span>
        {Icon && <span className={`grid size-8 shrink-0 place-items-center rounded-sm ${ICON[tone]}`}><Icon aria-hidden size={17} strokeWidth={2} /></span>}
      </span>
      {loading ? <Skeleton className="mt-3 h-9 w-16" /> : (
        <span className="mt-2 block font-display text-[34px] font-semibold leading-none tracking-tight text-ink tnum">{value}</span>
      )}
      {hint && <span className="mt-2 block text-sm text-muted">{hint}</span>}
    </>
  );
  const cls = 'relative flex flex-col overflow-hidden rounded-md border border-line bg-surface p-4 pt-5 shadow-card sm:p-5 sm:pt-6';
  return to
    ? <Link to={to} className={`${cls} transition-[border-color,transform] hover:-translate-y-px hover:border-line-strong`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}
