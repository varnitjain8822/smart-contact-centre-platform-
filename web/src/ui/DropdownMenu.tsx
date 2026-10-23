import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { panelClass, useDismiss, type TriggerProps } from './Popover';

export type MenuItem = { label: ReactNode; onSelect(): void; icon?: LucideIcon; danger?: boolean; checked?: boolean } | 'separator';

/** WAI-ARIA menu button: ↓/Enter/Space opens on the first item, ↑ on the last; ↑/↓/Home/End move; Esc/Tab close. */
export function DropdownMenu({ trigger, items, label, header, align = 'end' }: {
  trigger(p: TriggerProps & { onKeyDown(e: KeyboardEvent): void }): ReactNode; items: MenuItem[]; label: string;
  header?: ReactNode; align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState<false | 'first' | 'last'>(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useRef(() => setOpen(false)).current;
  useDismiss(!!open, close, wrap, btn);

  const els = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
  useEffect(() => { if (open) { const l = els(); (open === 'last' ? l[l.length - 1] : l[0])?.focus(); } }, [open]);

  const onTrigger = (e: KeyboardEvent) => {
    if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen('first'); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setOpen('last'); }
  };
  const onMenu = (e: KeyboardEvent) => {
    const l = els();
    const i = l.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: l.length - 1 }[e.key];
    if (to !== undefined) { e.preventDefault(); l[(to + l.length) % l.length]?.focus(); }
    if (e.key === 'Tab') close();
  };
  const pick = (f: () => void) => { close(); btn.current?.focus(); f(); };

  return (
    <div ref={wrap} className="relative">
      {trigger({ ref: btn, onClick: () => setOpen((o) => (o ? false : 'first')), onKeyDown: onTrigger,
        'aria-expanded': !!open, 'aria-controls': id, 'aria-haspopup': 'menu' })}
      {open && (
        <div ref={menu} id={id} role="menu" aria-label={label} onKeyDown={onMenu} className={`${panelClass(align)} min-w-56 py-1.5`}>
          {header && <div className="border-b border-line px-4 pb-3 pt-2">{header}</div>}
          {items.map((it, i) => it === 'separator' ? <div key={i} role="separator" className="my-1.5 h-px bg-line" /> : (
            <button key={i} type="button" tabIndex={-1} role={it.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={it.checked} onClick={() => pick(it.onSelect)}
              className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-[15px] font-medium transition-colors focus-visible:-outline-offset-2
                focus-visible:bg-surface-2 hover:bg-surface-2 ${it.danger ? 'text-bad' : 'text-ink'}`}>
              {it.icon && <it.icon aria-hidden size={18} strokeWidth={1.75} className={it.danger ? '' : 'text-ink-2'} />}
              <span className="flex-1">{it.label}</span>
              {it.checked && <Check aria-hidden size={17} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
