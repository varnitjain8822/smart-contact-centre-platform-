import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataTable, type Column } from '../src/ui/DataTable';
import { DropdownMenu } from '../src/ui/DropdownMenu';
import { FileDrop } from '../src/ui/FileDrop';
import { Tabs } from '../src/ui/Tabs';
import { ErrorBoundary } from '../src/features/shell/ErrorBoundary';
import { CommandPalette, ticketNumber } from '../src/features/shell/CommandPalette';
import { LanguageSwitch } from '../src/features/shell/LanguageSwitch';
import i18n, { loadLocale } from '../src/i18n';
import { ticket, wrap } from './helpers';

const wide = (matches: boolean) => vi.spyOn(window, 'matchMedia').mockImplementation(
  (q: string) => ({ matches, media: q, addEventListener() {}, removeEventListener() {} }) as never);

type R = { n: string; subject: string; age: number };
const rows: R[] = [{ n: 'SC-2', subject: 'Banana', age: 3 }, { n: 'SC-1', subject: 'apple', age: 9 }, { n: 'SC-3', subject: 'Cherry', age: 1 }];
const cols: Column<R>[] = [
  { key: 'n', header: 'Number', cell: (r) => r.n, primary: true },
  { key: 'subject', header: 'Subject', cell: (r) => r.subject, sort: (r) => r.subject.toLowerCase() },
  { key: 'age', header: 'Age', cell: (r) => r.age, sort: (r) => r.age, align: 'end' },
];

describe('DataTable', () => {
  it('sorts by a column header, toggling direction, with aria-sort', async () => {
    wide(true);
    render(<DataTable columns={cols} rows={rows} rowKey={(r) => r.n} caption="Tickets" rowHref={(r) => `/tickets/${r.n}`} />, { wrapper: wrap() });
    const table = screen.getByRole('table', { name: 'Tickets' });
    const firstCells = () => within(table).getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]!.textContent);
    expect(firstCells()).toEqual(['SC-2', 'SC-1', 'SC-3']);
    const th = screen.getByRole('columnheader', { name: /Subject/ });
    expect(th.getAttribute('aria-sort')).toBe('none');
    await userEvent.click(within(th).getByRole('button'));
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    expect(firstCells()).toEqual(['SC-1', 'SC-2', 'SC-3']);
    await userEvent.click(within(th).getByRole('button'));
    expect(th.getAttribute('aria-sort')).toBe('descending');
    expect(firstCells()).toEqual(['SC-3', 'SC-2', 'SC-1']);
    expect(screen.getByRole('link', { name: 'SC-1' }).getAttribute('href')).toBe('/tickets/SC-1');
  });

  it('collapses into cards below 768 px, sortable via a select', async () => {
    wide(false);
    render(<DataTable columns={cols} rows={rows} rowKey={(r) => r.n} caption="Tickets" />, { wrapper: wrap() });
    expect(screen.queryByRole('table')).toBeNull();
    const list = screen.getByRole('list', { name: 'Tickets' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getAllByText('Subject')).toHaveLength(3); // header becomes each card's label
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'age:asc');
    expect(within(list).getAllByRole('listitem').map((li) => li.querySelector('p')!.textContent)).toEqual(['SC-3', 'SC-2', 'SC-1']);
  });
});

describe('CommandPalette', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalises ticket numbers', () => {
    expect(ticketNumber('1042')).toBe('SC-1042');
    expect(ticketNumber(' sc-1042 ')).toBe('SC-1042');
    expect(ticketNumber('sc1042')).toBe('SC-1042');
    expect(ticketNumber('refund')).toBeNull();
  });

  it('arrow keys move the active option; Enter opens it; ticket lookup by number', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
      url.startsWith('/api/tickets/') ? { ticket: ticket({ number: 'SC-1042', subject: 'Refund pending' }) } : { items: [] }))));
    let path = '';
    const Where = () => { path = useLocation().pathname; return null; };
    const onClose = vi.fn();
    render(<><CommandPalette open signedIn onClose={onClose} /><Where /></>, { wrapper: wrap() });
    const input = screen.getByRole('combobox');
    const selected = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')!;
    expect(selected().textContent).toContain('Home');
    expect(input.getAttribute('aria-activedescendant')).toBe(selected().id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(selected().textContent).toContain('My tickets');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // wraps to the last
    expect(selected().textContent).toContain('Profile');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onClose).toHaveBeenCalled();
    expect(path).toBe('/profile');

    await userEvent.type(input, '1042');
    expect(await screen.findByRole('option', { name: /SC-1042 · Refund pending/ })).toBeTruthy();
    expect(selected().textContent).toContain('SC-1042');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(path).toBe('/tickets/SC-1042');
  });
});

describe('ErrorBoundary', () => {
  it('shows the error panel and recovers on Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let boom = true;
    const Bomb = () => { if (boom) throw new Error('x'); return <p>Recovered</p>; };
    render(<ErrorBoundary><Bomb /></ErrorBoundary>, { wrapper: wrap() });
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong');
    boom = false;
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(screen.getByText('Recovered')).toBeTruthy();
  });
});

describe('LanguageSwitch', () => {
  afterEach(async () => { await act(() => loadLocale('en')); localStorage.clear(); });

  it('switches to Hindi, persists it and sets <html lang>', async () => {
    const Label = () => <h1>{useTranslation().t('nav.tickets')}</h1>;
    render(<><LanguageSwitch /><Label /></>, { wrapper: wrap() });
    expect(screen.getByRole('heading').textContent).toBe('My tickets');
    await userEvent.click(screen.getByRole('button', { name: 'EN · Language: English' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'हिन्दी' }));
    expect(await screen.findByRole('heading', { name: 'मेरे टिकट' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('hi');
    expect(localStorage.getItem('scc-locale')).toBe('hi');
    expect(screen.getByRole('button', { name: 'हि · भाषा: हिन्दी' })).toBeTruthy();
    expect(i18n.t('sla.left', { d: '5 मि' })).toBe('5 मि बाकी');
  });
});

describe('DropdownMenu / Tabs / FileDrop', () => {
  it('menu button: ↓ opens on first item, ↑ wraps, Esc closes and refocuses the trigger', async () => {
    const on = vi.fn();
    render(<DropdownMenu label="Account" items={[{ label: 'Profile', onSelect: on }, 'separator', { label: 'Sign out', onSelect: () => {} }]}
      trigger={(p) => <button type="button" {...p}>Menu</button>} />);
    const btn = screen.getByRole('button', { name: 'Menu' });
    btn.focus();
    fireEvent.keyDown(btn, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Profile');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toBe('Sign out');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(btn);
    await userEvent.click(btn);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(on).toHaveBeenCalled();
  });

  it('tabs: arrow keys select and focus the next tab', () => {
    function T() {
      const [v, setV] = useState<'a' | 'b'>('a');
      return <Tabs<'a' | 'b'> label="View" value={v} onChange={setV} items={[{ value: 'a', label: 'Open', count: 2 }, { value: 'b', label: 'Closed' }]}>{v}</Tabs>;
    }
    render(<T />);
    const open = screen.getByRole('tab', { name: /Open/ });
    open.focus();
    fireEvent.keyDown(open, { key: 'ArrowRight' });
    const closed = screen.getByRole('tab', { name: 'Closed' });
    expect(closed.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(closed);
    expect(screen.getByRole('tabpanel').textContent).toBe('b');
  });

  it('file drop: accepts valid files, rejects bad type/size, takes pasted screenshots, shows progress', () => {
    const on = vi.fn();
    const big = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 11 * 1048576 });
    const { container, rerender } = render(<FileDrop onFiles={on} />);
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['z'], 'z.exe', { type: 'application/x-msdownload' }), big] } });
    expect(on).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.pdf' })]);
    expect(screen.getByRole('alert').textContent).toMatch(/z\.exe.*big\.png is larger than 10 MB/s);

    const paste = new Event('paste') as Event & { clipboardData: unknown };
    paste.clipboardData = { files: [new File(['p'], 'image.png', { type: 'image/png' })] };
    document.dispatchEvent(paste);
    expect(on).toHaveBeenLastCalledWith([expect.objectContaining({ name: expect.stringMatching(/^screenshot-\d+\.png$/) })]);

    rerender(<FileDrop onFiles={on} items={[{ id: '1', file: new File(['a'], 'a.pdf', { type: 'application/pdf' }), progress: 40 }]} onRemove={() => {}} />);
    expect(screen.getByRole('progressbar', { name: 'Uploading a.pdf' }).getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByRole('button', { name: 'Remove a.pdf' })).toBeTruthy();
  });
});
