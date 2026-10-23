import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Native modal <dialog>: focus trap + Esc for free; focus returns to the opener on close. */
/** `sheet` = slides in from the right edge (full height), for drawers. */
export function Dialog({ open, title, onClose, children, sheet }: { open: boolean; title: string; onClose(): void; children: ReactNode; sheet?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { opener.current = document.activeElement as HTMLElement | null; d.showModal(); }
    if (!open && d.open) d.close();
    if (!open) opener.current?.focus();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={id} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] ${sheet ? 'm-0 ml-auto h-dvh max-h-dvh w-[min(92vw,400px)] rounded-l-md' : 'w-[min(92vw,440px)] rounded-md'}`}>
      <div className="p-6">
        <h2 id={id} className="text-xl font-semibold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}
