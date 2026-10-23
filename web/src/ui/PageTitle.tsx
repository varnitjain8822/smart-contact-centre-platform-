import { useEffect, useRef, type ReactNode } from 'react';
import { setPageTitle } from '../lib/title';

let firstPage = true;

/** The page's single <h1>: sets document.title and takes focus on route change (not on first load). */
export function PageTitle({ title, children, className = '' }: { title: string; children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setPageTitle(title);
    if (firstPage) firstPage = false;
    else ref.current?.focus({ preventScroll: false });
  }, [title]);
  return <h1 ref={ref} tabIndex={-1} className={`font-display font-semibold tracking-tight ${className}`}>{children ?? title}</h1>;
}
