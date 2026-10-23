import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from 'react';

/** Hover (after 300 ms) or focus shows; Esc dismisses (WCAG 1.4.13). The child gets aria-describedby. */
export function Tooltip({ content, children, side = 'top' }: { content: string; children: ReactElement; side?: 'top' | 'bottom' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!open) return;
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (delay: number) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), delay); };
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  return (
    <span className="relative inline-flex" onMouseEnter={() => show(300)} onMouseLeave={hide} onFocus={() => show(0)} onBlur={hide}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span role="tooltip" id={id} hidden={!open}
        className={`absolute left-1/2 z-50 w-max max-w-60 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1.5 text-xs font-medium text-bg shadow-card
          ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
        {content}
      </span>
    </span>
  );
}
