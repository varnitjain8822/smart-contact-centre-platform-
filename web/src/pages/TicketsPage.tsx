import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, Plus, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useTickets } from '../features/tickets/hooks';
import { TicketCard } from '../features/tickets/TicketCard';
import { StatusPill } from '../features/tickets/StatusPill';
import { PriorityTag } from '../features/tickets/PriorityTag';
import { SlaChip } from '../features/tickets/SlaChip';
import { ago, categoryLabel, priorityLabel, statusLabel } from '../lib/format';
import { useDebounced } from '../lib/useDebounced';
import { useNow } from '../lib/useNow';
import { categoryKeys } from '../lib/company';
import { PRIORITIES, STATUSES, type TicketFilters, type TicketSort, type TicketSummary } from '../lib/types';
import { Button, buttonClass } from '../ui/Button';
import { DataTable, type Column } from '../ui/DataTable';
import { ChannelBadge } from '../features/tickets/ChannelBadge';
import { EmptyState, RetryBlock } from '../ui/EmptyState';
import { PageTitle } from '../ui/PageTitle';
import { Popover } from '../ui/Popover';
import { Loading, Skeleton } from '../ui/Skeleton';

const SORTS: TicketSort[] = ['updated', 'created', 'priority', 'sla'];
const list = <T extends string>(v: string | null, allowed: readonly T[]) => (v ?? '').split(',').filter((x): x is T => allowed.includes(x as T));
const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** URL ⇄ filters. Unknown values are dropped, so a hand-edited link never breaks the page. */
export function parseFilters(sp: URLSearchParams): TicketFilters {
  const sort = SORTS.find((s) => s === sp.get('sort'));
  return { q: sp.get('q')?.slice(0, 100) || undefined, status: list(sp.get('status'), STATUSES), category: list(sp.get('category'), categoryKeys()),
    priority: list(sp.get('priority'), PRIORITIES), from: isDate(sp.get('from')), to: isDate(sp.get('to')), sort: sort === 'updated' ? undefined : sort };
}
export function toSearch(f: TicketFilters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) { const s = Array.isArray(v) ? v.join(',') : v; if (s) p.set(k, s); }
  return p;
}

export default function TicketsPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const f = parseFilters(sp);
  const set = (p: Partial<TicketFilters>) => setSp(toSearch({ ...f, ...p }), { replace: true });
  const [q, setQ] = useState(f.q ?? '');
  const dq = useDebounced(q.trim(), 300);
  useEffect(() => { if ((dq || undefined) !== f.q) set({ q: dq || undefined }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const query = useTickets({ ...f, status: f.status?.length ? f.status : undefined, category: f.category?.length ? f.category : undefined, priority: f.priority?.length ? f.priority : undefined });
  const now = useNow(30_000);
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
  const more = (f.category?.length ?? 0) + (f.priority?.length ?? 0) + (f.from ? 1 : 0) + (f.to ? 1 : 0);
  const any = !!(f.q || f.status?.length || more);
  const sort = f.sort ?? 'updated';
  const toggle = <T extends string>(arr: T[] | undefined, v: T) => (arr?.includes(v) ? arr.filter((x) => x !== v) : [...(arr ?? []), v]);

  const cols: Column<TicketSummary>[] = [
    { key: 'created', header: t('tickets.col.number'), serverSort: 'desc', cell: (r) => <span className="font-display font-semibold tracking-tight text-muted tnum">{r.number}</span> },
    { key: 'subject', header: t('tickets.col.subject'), primary: true, cell: (r) => <span className="line-clamp-2">{r.subject} <ChannelBadge channel={r.channel} /></span> },
    { key: 'status', header: t('tickets.col.status'), cell: (r) => <StatusPill status={r.status} /> },
    { key: 'priority', header: t('tickets.col.priority'), serverSort: 'desc', cell: (r) => <PriorityTag priority={r.priority} /> },
    { key: 'sla', header: t('tickets.col.sla'), serverSort: 'asc', cell: (r) => <SlaChip sla={r.sla} now={now} start={r.createdAt} /> },
    { key: 'updated', header: t('tickets.col.updated'), serverSort: 'desc', align: 'end', cell: (r) => <time dateTime={r.updatedAt} className="whitespace-nowrap text-sm">{ago(r.updatedAt, now)}</time> },
  ];

  return (
    <div className="mx-auto max-w-3xl xl:max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title={t('nav.tickets')} className="text-3xl md:text-[40px]" />
        <Link to="/tickets/new" className={buttonClass('primary', 'md:hidden')}><Plus aria-hidden size={18} /> {t('nav.newTicket')}</Link>
      </div>

      <div role="search" aria-label={t('tickets.filters')} className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search aria-hidden size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <label htmlFor="tq" className="sr-only">{t('tickets.search')}</label>
            <input id="tq" type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} placeholder={t('tickets.searchPlaceholder')}
              className="min-h-11 w-full rounded-pill border border-line-strong bg-surface pl-11 pr-4 text-ink placeholder:text-muted transition-colors hover:border-ink-2 focus-visible:border-accent" />
          </div>
          <Popover label={t('tickets.moreFilters')} align="end" className="w-[22rem]"
            trigger={(p) => (
              <button type="button" {...p} className={buttonClass('secondary', '!px-4')}>
                <SlidersHorizontal aria-hidden size={17} /> {t('tickets.moreFilters')}
                {more > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-pill bg-accent px-1.5 text-xs font-bold text-on-accent tnum">{more}</span>}
              </button>
            )}>
            <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-4">
              <CheckGroup legend={t('details.topic')} options={categoryKeys().map((c) => ({ v: c, label: categoryLabel(c) }))} value={f.category ?? []}
                onToggle={(v) => set({ category: toggle(f.category, v) })} />
              <CheckGroup legend={t('details.priority')} options={PRIORITIES.map((p) => ({ v: p, label: priorityLabel(p) }))} value={f.priority ?? []}
                onToggle={(v) => set({ priority: toggle(f.priority, v) })} />
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink">{t('tickets.created')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['from', 'to'] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1 text-sm text-ink-2">{t(`tickets.${k}`)}
                      <input type="date" value={f[k] ?? ''} onChange={(e) => set({ [k]: e.target.value || undefined })}
                        className="min-h-11 rounded-sm border border-line-strong bg-surface px-2 text-ink" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Popover>
          <label className="hidden items-center gap-2 text-sm font-semibold text-ink-2 md:flex">
            <span>{t('table.sortBy')}</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value as TicketSort })} aria-label={t('table.sortBy')}
              className="min-h-11 rounded-pill border border-line-strong bg-surface px-3 text-ink">
              {SORTS.map((s) => <option key={s} value={s}>{t(`tickets.sort.${s}`)}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('tickets.col.status')}>
          {STATUSES.map((s) => {
            const on = !!f.status?.includes(s);
            return (
              <button key={s} type="button" aria-pressed={on} onClick={() => set({ status: toggle(f.status, s) })}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-semibold transition-colors
                  ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'}`}>
                {statusLabel(s)}{on && <X aria-hidden size={14} />}
              </button>
            );
          })}
          {any && (
            <button type="button" onClick={() => { setQ(''); setSp(toSearch({ sort: f.sort }), { replace: true }); }}
              className="min-h-11 rounded-sm px-2 text-sm font-semibold text-accent hover:underline">{t('tickets.clear')}</button>
          )}
        </div>
      </div>

      <section aria-label={t('tickets.results')} aria-busy={query.isFetching} className="mt-6">
        {query.isPending ? (
          <Loading label={t('home.loading')} className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-md" />)}</Loading>
        ) : query.isError ? (
          <RetryBlock onRetry={() => query.refetch()} />
        ) : (
          <>
            <DataTable caption={t('tickets.results')} columns={cols} rows={rows} rowKey={(r) => r.number} rowHref={(r) => `/tickets/${r.number}`}
              sort={{ key: sort, dir: 'desc' }} onSort={(k) => set({ sort: k as TicketSort })} card={(r) => <TicketCard t={r} now={now} />}
              empty={any
                ? <EmptyState icon={<SearchX aria-hidden size={26} />} title={t('tickets.noMatch')}
                    actions={<Button variant="secondary" onClick={() => { setQ(''); setSp(toSearch({ sort: f.sort }), { replace: true }); }}>{t('tickets.clear')}</Button>}>
                    {t('tickets.noMatchBody')}
                  </EmptyState>
                : <EmptyState icon={<Inbox aria-hidden size={26} />} title={t('tickets.emptyTitle')}
                    actions={<Link to="/tickets/new" className={buttonClass('primary')}><Plus aria-hidden size={18} /> {t('common.raiseTicket')}</Link>}>
                    {t('tickets.emptyBody')}
                  </EmptyState>} />
            {rows.length > 0 && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-sm text-muted" role="status">{t('tickets.showing', { count: rows.length })}</p>
                {query.hasNextPage && <Button variant="secondary" pending={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{t('tickets.loadMore')}</Button>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CheckGroup<T extends string>({ legend, options, value, onToggle }: { legend: string; options: { v: T; label: string }[]; value: T[]; onToggle(v: T): void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-x-3">
        {options.map((o) => (
          <label key={o.v} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-ink">
            <input type="checkbox" checked={value.includes(o.v)} onChange={() => onToggle(o.v)} className="size-[18px] accent-[rgb(var(--accent))]" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
