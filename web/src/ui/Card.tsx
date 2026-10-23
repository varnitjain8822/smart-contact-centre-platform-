import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-md border border-line bg-surface shadow-card ${className}`} {...rest} />;
}

/** Title row for a Card: heading + optional description + right-aligned action. */
export function CardHeader({ title, desc, action, id, as: H = 'h2' }: {
  title: ReactNode; desc?: ReactNode; action?: ReactNode; id?: string; as?: 'h2' | 'h3';
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <H id={id} className="text-lg font-semibold">{title}</H>
        {desc && <p className="mt-0.5 text-sm text-ink-2">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
