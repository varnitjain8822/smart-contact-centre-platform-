import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CornerDownLeft, Search, Ticket, type LucideIcon } from 'lucide-react';
import { useTicket } from '../tickets/hooks';
import { useKbArticles } from '../kb/hooks';
import { useDebounced } from '../../lib/useDebounced';
import { categoryLabel, statusLabel } from '../../lib/format';
import { NAV } from './SideNav';

type Item = { id: string; group: 'pages' | 'tickets' | 'articles'; label: string; sub?: string; icon: LucideIcon; to: string };

/** "1042", "sc1042", "SC-1042" → "SC-1042". */
export const ticketNumber = (q: string) => { const m = /^\s*(?:sc[-\s]?)?(\d{1,7})\s*$/i.exec(q); return m ? `SC-${m[1]}` : null; };


/** ⌘K palette: jump to a page, open a ticket by number, or search help articles. Combobox + listbox pattern. */
export function CommandPalette({ open, onClose, signedIn }: { open: boolean; onClose(): void; signedIn: boolean }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const nav = useNavigate();
  const id = useId();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim(), 250);
  const num = signedIn ? ticketNumber(dq) : null;
  const ticket = useTicket(num ?? '', !!num);
  const kb = useKbArticles({ q: dq, enabled: open && dq.length >= 2 });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { opener.current = document.activeElement as HTMLElement | null; setQ(''); d.showModal(); }
    if (!open && d.open) d.close();
    if (!open) opener.current?.focus();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const ql = q.trim().toLowerCase();
    const pages = NAV.filter((n) => signedIn || n.to === '/help')
      .map((n) => ({ id: `p${n.to}`, group: 'pages' as const, label: t(n.label), icon: n.icon, to: n.to }))
      .filter((p) => !ql || p.label.toLowerCase().includes(ql));
    const tickets: Item[] = num && ticket.data && ticket.data.number === num
      ? [{ id: `t${num}`, group: 'tickets', label: `${num} · ${ticket.data.subject}`, sub: statusLabel(ticket.data.status), icon: Ticket, to: `/tickets/${num}` }]
      : [];
    const arts: Item[] = dq.length >= 2 ? (kb.data ?? []).slice(0, 5).map((a) => ({
      id: `a${a.slug}`, group: 'articles', label: a.title, sub: categoryLabel(a.category), icon: BookOpen, to: `/help/${a.slug}` })) : [];
    return [...tickets, ...pages, ...arts];
  }, [q, dq, signedIn, num, ticket.data, kb.data, t]);

  useEffect(() => setActive(0), [items.length, q]);
  const loading = (num && ticket.isFetching) || (dq.length >= 2 && kb.isFetching) || q.trim() !== dq;
  const notFound = num && ticket.isError;

  const go = (it: Item | undefined) => { if (!it) return; onClose(); nav(it.to); };
  const key = (e: KeyboardEvent) => {
    if (!items.length) return;
    const to = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to !== undefined) { e.preventDefault(); setActive((to + items.length) % items.length); }
    if (e.key === 'Enter') { e.preventDefault(); go(items[active]); }
  };
  useEffect(() => { document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' }); }, [active, id]);

  const groups = (['tickets', 'pages', 'articles'] as const).filter((g) => items.some((i) => i.group === g));
  return (
    <dialog ref={ref} aria-label={t('palette.label')} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="mt-[10vh] w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-md border border-line bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search aria-hidden size={20} className="shrink-0 text-muted" />
        <input role="combobox" aria-expanded aria-controls={`${id}-list`} aria-autocomplete="list" autoFocus
          aria-activedescendant={items.length ? `${id}-${active}` : undefined} aria-label={t('palette.label')}
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} maxLength={100}
          placeholder={t(signedIn ? 'palette.placeholder' : 'palette.placeholderGuest')}
          className="min-h-14 flex-1 bg-transparent text-[17px] text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none" />
        <kbd className="hidden rounded-sm border border-line px-1.5 py-0.5 text-xs font-semibold text-muted sm:block">esc</kbd>
      </div>
      <div id={`${id}-list`} role="listbox" aria-label={t('palette.results')} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
        {groups.map((g) => (
          <div key={g} role="group" aria-labelledby={`${id}-g${g}`} className="mb-1">
            <p id={`${id}-g${g}`} className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t(`palette.${g}`)}</p>
            {items.map((it, i) => it.group === g && (
              <div key={it.id} id={`${id}-${i}`} role="option" aria-selected={i === active}
                onClick={() => go(it)} onMouseMove={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 ${i === active ? 'bg-accent-soft text-ink' : 'text-ink'}`}>
                <it.icon aria-hidden size={18} strokeWidth={1.75} className={`shrink-0 ${i === active ? 'text-accent' : 'text-muted'}`} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{it.label}</span>
                {it.sub && <span className="shrink-0 text-sm text-muted">{it.sub}</span>}
                {i === active && <CornerDownLeft aria-hidden size={15} className="shrink-0 text-accent" />}
              </div>
            ))}
          </div>
        ))}
        <p role="status" className="px-3 py-2 text-sm text-muted empty:hidden">
          {loading ? t('palette.searching') : notFound ? t('palette.noTicket', { n: num }) : !items.length ? t('palette.empty', { q: q.trim() }) : ''}
        </p>
      </div>
      <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-xs text-muted sm:flex">
        <span><kbd className="font-semibold">↑↓</kbd> {t('palette.move')}</span>
        <span><kbd className="font-semibold">↵</kbd> {t('palette.open')}</span>
        {signedIn && <span className="ml-auto">{t('palette.tip')}</span>}
      </div>
    </dialog>
  );
}
