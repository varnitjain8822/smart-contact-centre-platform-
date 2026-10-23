import type { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`shimmer rounded-sm ${className}`} />;
}

/** Paragraph placeholder: n lines, the last one shorter. */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : ''}`} />)}
    </div>
  );
}

/** aria-busy region with a screen-reader label around skeletons. */
export function Loading({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only" role="status">{label}</span>
      {children}
    </div>
  );
}
