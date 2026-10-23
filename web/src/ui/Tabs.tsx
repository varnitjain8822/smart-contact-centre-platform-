import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Count } from './Badge';

/** WAI-ARIA tabs: roving tabindex, ←/→/Home/End move and select. Children render inside the active tabpanel. */
export function Tabs<V extends string>({ label, value, onChange, items, children }: {
  label: string; value: V; onChange(v: V): void; items: { value: V; label: string; count?: number }[]; children?: ReactNode;
}) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const key = (e: KeyboardEvent) => {
    const i = items.findIndex((x) => x.value === value);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const it = items[(next + items.length) % items.length]!;
    onChange(it.value);
    list.current?.querySelector<HTMLElement>(`[data-v="${it.value}"]`)?.focus();
  };
  return (
    <div>
      <div ref={list} role="tablist" aria-label={label} onKeyDown={key} className="flex gap-1 overflow-x-auto border-b border-line">
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button key={it.value} type="button" role="tab" data-v={it.value} id={`${id}-${it.value}`} aria-selected={on}
              aria-controls={`${id}-panel`} tabIndex={on ? 0 : -1} onClick={() => onChange(it.value)}
              className={`relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[15px] font-semibold transition-colors
                ${on ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}>
              {it.label}
              {it.count !== undefined && <Count n={it.count} />}
            </button>
          );
        })}
      </div>
      {children !== undefined && (
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${value}`} tabIndex={0} className="pt-5 focus-visible:outline-offset-4">
          {children}
        </div>
      )}
    </div>
  );
}
