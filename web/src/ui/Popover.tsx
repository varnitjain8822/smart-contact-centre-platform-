import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';

/** Close on outside pointer, Esc (focus returns to the trigger) or focus leaving the wrapper. */
export function useDismiss(open: boolean, close: () => void, wrap: RefObject<HTMLElement>, trigger: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); trigger.current?.focus(); } };
    const focus = (e: FocusEvent) => { if (e.target instanceof Node && !wrap.current?.contains(e.target)) close(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    document.addEventListener('focusin', focus);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); document.removeEventListener('focusin', focus); };
  }, [open, close, wrap, trigger]);
}

export type TriggerProps = {
  ref: RefObject<HTMLButtonElement>; onClick(): void; 'aria-expanded': boolean; 'aria-controls': string; 'aria-haspopup': 'dialog' | 'menu';
};

export const panelClass = (align: 'start' | 'end') =>
  `arrive absolute top-full z-40 mt-2 rounded-md border border-line bg-surface text-ink shadow-pop ${align === 'end' ? 'right-0' : 'left-0'}`;

/** Non-modal dialog anchored under its trigger. `children` may be a render function receiving `close`. */
export function Popover({ trigger, children, label, align = 'end', className = 'w-80' }: {
  trigger(p: TriggerProps): ReactNode; children: ReactNode | ((close: () => void) => ReactNode); label: string;
  align?: 'start' | 'end'; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useRef(() => setOpen(false)).current;
  useDismiss(open, close, wrap, btn);
  useEffect(() => {
    if (open) (panel.current?.querySelector<HTMLElement>('a,button,input,[tabindex="0"]') ?? panel.current)?.focus();
  }, [open]);
  return (
    <div ref={wrap} className="relative">
      {trigger({ ref: btn, onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': 'dialog' })}
      {open && (
        <div ref={panel} id={id} role="dialog" aria-label={label} tabIndex={-1} className={`${panelClass(align)} max-sm:fixed max-sm:inset-x-3 max-sm:top-[60px] max-sm:mt-0 max-sm:w-auto ${className}`}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
