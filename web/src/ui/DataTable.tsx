import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMediaQuery } from '../lib/useMediaQuery';

export type Column<R> = {
  key: string; header: string; cell(r: R): ReactNode;
  /** Makes the column sortable (client-side). */
  sort?(r: R): string | number;
  /** Sortable by the server (controlled mode); the header shows this direction when active. */
  serverSort?: 'asc' | 'desc';
  align?: 'start' | 'end';
  /** The card title on mobile, and the row's link text when `rowHref` is set. */
  primary?: boolean;
};
export type Sort = { key: string; dir: 'asc' | 'desc' };

/** Sortable table ≥768 px; below that every row collapses into a card (title + label/value pairs). */
/**
 * Controlled (server) sort: pass `sort` + `onSort` and mark sortable columns with `serverSort`; rows are shown as given
 * and a header click calls `onSort(key)` (the server's order has one direction per key). `card` replaces the default mobile card.
 */
export function DataTable<R>({ columns, rows, rowKey, caption, rowHref, initialSort, empty, sort: controlled, onSort, card }: {
  columns: Column<R>[]; rows: R[]; rowKey(r: R): string; caption: string; rowHref?(r: R): string;
  initialSort?: Sort; empty?: ReactNode; sort?: Sort; onSort?(key: string): void; card?(r: R): ReactNode;
}) {
  const { t } = useTranslation();
  const wide = useMediaQuery('(min-width: 768px)');
  const nav = useNavigate();
  const [local, setSort] = useState<Sort | undefined>(initialSort);
  const sort = onSort ? controlled : local;
  const sortable = (c: Column<R>) => (onSort ? !!c.serverSort : !!c.sort);
  const sorted = useMemo(() => {
    const f = columns.find((c) => c.key === sort?.key)?.sort;
    if (onSort || !f || !sort) return rows;
    const m = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * m; });
  }, [rows, columns, sort, onSort]);
  const toggle = (key: string) => (onSort ? onSort(key) : setSort((s) => ({ key, dir: s?.key === key && s.dir === 'asc' ? 'desc' : 'asc' })));
  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  const title = (r: R) => rowHref
    ? <Link to={rowHref(r)} className="after:absolute after:inset-0 hover:underline hover:underline-offset-4">{primary.cell(r)}</Link>
    : primary.cell(r);

  if (!rows.length && empty) return <>{empty}</>;

  if (!wide) {
    const sortCols = columns.filter(sortable);
    return (
      <div>
        {onSort ? sortCols.length > 0 && (
          <label className="mb-3 flex items-center justify-end gap-2 text-sm font-semibold text-ink-2">
            {t('table.sortBy')}
            <select value={sort?.key ?? ''} onChange={(e) => onSort(e.target.value)} className="min-h-11 rounded-sm border border-line-strong bg-surface px-2 text-ink">
              {sortCols.map((c) => <option key={c.key} value={c.key}>{c.header}</option>)}
            </select>
          </label>
        ) : sortCols.length > 0 && (
          <label className="mb-3 flex items-center justify-end gap-2 text-sm font-semibold text-ink-2">
            {t('table.sortBy')}
            <select value={sort ? `${sort.key}:${sort.dir}` : ''} className="min-h-11 rounded-sm border border-line-strong bg-surface px-2 text-ink"
              onChange={(e) => { const [key = '', dir] = e.target.value.split(':'); setSort(key ? { key, dir: dir as Sort['dir'] } : undefined); }}>
              <option value="">{t('table.defaultOrder')}</option>
              {sortCols.flatMap((c) => (['asc', 'desc'] as const).map((d) => (
                <option key={c.key + d} value={`${c.key}:${d}`}>{t(d === 'asc' ? 'table.asc' : 'table.desc', { col: c.header })}</option>
              )))}
            </select>
          </label>
        )}
        <ul aria-label={caption} className="flex flex-col gap-3">
          {sorted.map((r) => card ? <li key={rowKey(r)}>{card(r)}</li> : (
            <li key={rowKey(r)} className="relative rounded-md border border-line bg-surface p-4 shadow-card">
              <p className="font-semibold text-ink">{title(r)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {columns.filter((c) => c !== primary).map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs font-semibold text-muted">{c.header}</dt>
                    <dd className="mt-0.5 text-ink">{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface shadow-card">
      <table className="w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2/50">
            {columns.map((c) => {
              const dir = sort?.key === c.key ? (onSort ? c.serverSort : sort.dir) : undefined;
              const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown;
              return (
                <th key={c.key} scope="col" aria-sort={sortable(c) ? (dir ? (dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted ${c.align === 'end' ? 'text-right' : ''}`}>
                  {sortable(c) ? (
                    <button type="button" onClick={() => toggle(c.key)}
                      className={`-mx-1.5 inline-flex min-h-9 items-center gap-1 rounded-sm px-1.5 uppercase hover:text-ink ${dir ? 'text-ink' : ''}`}>
                      {c.header}<Icon aria-hidden size={14} className={dir ? '' : 'opacity-50'} />
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((r) => (
            <tr key={rowKey(r)} onClick={rowHref ? (e) => { if (!(e.target as HTMLElement).closest('a,button')) nav(rowHref(r)); } : undefined}
              className={rowHref ? 'cursor-pointer transition-colors hover:bg-surface-2/50' : ''}>
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'end' ? 'text-right' : ''} ${c === primary ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                  {c === primary && rowHref ? <Link to={rowHref(r)} className="hover:underline hover:underline-offset-4">{c.cell(r)}</Link> : c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
