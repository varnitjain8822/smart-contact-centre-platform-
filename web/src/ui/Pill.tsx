import type { ReactNode } from 'react';

export type Tone = 'ai' | 'accent' | 'warn' | 'ok' | 'bad' | 'info' | 'neutral';
const T: Record<Tone, string> = {
  ai: 'text-ai bg-ai-soft',
  accent: 'text-accent bg-accent-soft',
  warn: 'text-warn bg-warn/10',
  ok: 'text-ok bg-ok/10',
  bad: 'text-bad bg-bad/10',
  info: 'text-info bg-info/10',
  neutral: 'text-ink-2 bg-surface-2',
};

export function Pill({ tone, icon, children, label }: { tone: Tone; icon?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <span aria-label={label} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-sm font-medium leading-none ${T[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
