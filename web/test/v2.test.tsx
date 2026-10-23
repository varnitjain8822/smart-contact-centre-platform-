import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { future, routes } from '../src/routes';
import { ToastProvider } from '../src/ui/Toast';
import { DataTable, type Column } from '../src/ui/DataTable';
import { parseFilters } from '../src/pages/TicketsPage';
import { useUploads } from '../src/features/tickets/useUploads';
import { LiveBell } from '../src/features/shell/NotificationBell';
import { useLiveEvents } from '../src/lib/live';
import { chatStream, sseParser } from '../src/features/assistant/stream';
import { toTicket, useAssistant } from '../src/features/assistant/useAssistant';
import { useLocale } from '../src/lib/locale';
import { AuthForm, strength } from '../src/features/auth/AuthForm';
import { readMinutes } from '../src/pages/ArticlePage';
import { Highlight } from '../src/features/kb/ArticleList';
import i18n, { loadLocale } from '../src/i18n';
import { mockFetch, msg, newQc, routeFetch, ticket, wrap } from './helpers';

afterEach(() => { vi.unstubAllGlobals(); });

const user = { id: 'u1', name: 'Priya Shah', email: 'p@x.co', createdAt: '', locale: 'en', notify: { email: { reply: true, status: true, sla: true }, inApp: true } };
const noNotes = { body: { items: [], unreadCount: 0, nextCursor: null } };
const overview = {
  counts: { open: 3, aiHandling: 1, waitingOnYou: 1, resolved30d: 7 }, avgFirstResponseMin: 12, avgResolutionHrs: 5.4, csatAvg: 4.6,
  slaWatch: [{ number: 'SC-1012', dueAt: new Date(Date.now() + 20 * 60_000).toISOString(), state: 'at_risk' }],
  activity: [{ type: 'agent_reply', ticket: 'SC-1012', at: new Date().toISOString(), text: 'Please send the invoice number.' }],
  popularArticles: [{ slug: 'refund-status', title: 'Refund status', views: 120 }],
};

function boot(path: string) {
  vi.stubGlobal('EventSource', class { addEventListener() {} close() {} });
  const qc = newQc();
  const router = createMemoryRouter(routes, { initialEntries: [path], future });
  render(<QueryClientProvider client={qc}><ToastProvider><RouterProvider router={router} future={{ v7_startTransition: true }} /></ToastProvider></QueryClientProvider>);
  return { qc, router };
}

describe('P2 Home overview', () => {
  it('renders stat cards, attention strip, activity and popular articles', async () => {
    routeFetch({
      'GET /api/auth/me': { body: { user } }, 'GET /api/me/overview': { body: overview }, 'GET /api/notifications': noNotes,
      'GET /api/tickets': (url) => ({ body: { items: url.includes('waiting_on_customer') ? [ticket({ number: 'SC-1020', subject: 'Send GSTIN', status: 'waiting_on_customer' })]
        : [ticket({ number: 'SC-1012', subject: 'Refund pending' })], nextCursor: null } }),
    });
    boot('/');
    const stats = await screen.findByRole('region', { name: 'Your tickets at a glance' });
    await within(stats).findByText('3');
    expect(within(stats).getByRole('link', { name: /Waiting on you/ }).getAttribute('href')).toBe('/tickets?status=waiting_on_customer');
    expect(within(stats).getByText('Avg rating 4.6/5')).toBeTruthy();
    const attn = screen.getByRole('region', { name: /Needs your attention/ });
    expect(within(attn).getByRole('link', { name: /SC-1020.*Reply needed.*Send GSTIN/ })).toBeTruthy();
    expect(within(attn).getByRole('link', { name: /SC-1012.*Due in 20 minutes.*Refund pending/ })).toBeTruthy();
    expect(screen.getByText('Please send the invoice number.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Refund status/ }).textContent).toContain('120 views');
    expect(screen.getByText('3 open tickets · 1 waiting on you · 1 close to its deadline')).toBeTruthy();
  });
});

describe('P3 tickets: URL filters + server sort', () => {
  it('parseFilters drops unknown values', () => {
    expect(parseFilters(new URLSearchParams('status=resolved,bogus&priority=high&sort=nope&from=2026-01-01&to=x&q=gst')))
      .toEqual({ q: 'gst', status: ['resolved'], category: [], priority: ['high'], from: '2026-01-01', to: undefined, sort: undefined });
  });

  it('URL → request; chips and header sort write back to the URL; Load more passes the cursor', async () => {
    const calls = routeFetch({
      'GET /api/auth/me': { body: { user } }, 'GET /api/notifications': noNotes,
      'GET /api/tickets': (url) => ({ body: { items: [ticket({ number: url.includes('before=') ? 'SC-2' : 'SC-1' })], nextCursor: url.includes('before=') ? null : 'c1' } }),
    });
    const { router } = boot('/tickets?status=resolved&sort=priority');
    await screen.findByRole('heading', { level: 1, name: 'My tickets' });
    await waitFor(() => expect(calls.some((c) => c.url.startsWith('/api/tickets?') && c.url.includes('status=resolved') && c.url.includes('sort=priority') && !c.url.includes('scope='))).toBe(true));
    expect(screen.getByRole('button', { name: 'Resolved' }).getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(screen.getByRole('button', { name: 'In progress' }));
    expect(router.state.location.search).toBe('?status=resolved%2Cin_progress&sort=priority');

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(calls.some((c) => c.url.includes('before=c1'))).toBe(true));

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('?sort=priority');
    await waitFor(() => expect(calls.at(-1)!.url).toContain('scope=all'));
  });

  it('DataTable controlled sort calls onSort and keeps the server order', async () => {
    type R = { n: string };
    const on = vi.fn();
    const cols: Column<R>[] = [{ key: 'n', header: 'Ticket', primary: true, cell: (r) => r.n }, { key: 'updated', header: 'Updated', serverSort: 'desc', cell: () => '' }];
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} } as never);
    render(<DataTable columns={cols} rows={[{ n: 'b' }, { n: 'a' }]} rowKey={(r) => r.n} caption="T" sort={{ key: 'updated', dir: 'desc' }} onSort={on} />, { wrapper: wrap() });
    expect(screen.getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual(['b', 'a']);
    expect(screen.getByRole('columnheader', { name: /Updated/ }).getAttribute('aria-sort')).toBe('descending');
    expect(within(screen.getByRole('columnheader', { name: 'Ticket' })).queryByRole('button')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Updated/ }));
    expect(on).toHaveBeenCalledWith('updated');
  });
});

class FakeXHR {
  static all: FakeXHR[] = [];
  upload = { onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) };
  onload?: () => void; onerror?: () => void;
  status = 0; responseText = ''; url = ''; withCredentials = false; sent?: FormData;
  constructor() { FakeXHR.all.push(this); }
  open(_m: string, u: string) { this.url = u; }
  send(b: FormData) { this.sent = b; }
  abort() {}
  getResponseHeader() { return null; }
  respond(status: number, body: unknown) { this.status = status; this.responseText = JSON.stringify(body); this.onload?.(); }
}

describe('P4 uploads', () => {
  it('uploads with progress, exposes the attachment, maps errors', async () => {
    FakeXHR.all = [];
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const { result } = renderHook(() => useUploads('SC-1'));
    const f1 = new File(['x'], 'a.png', { type: 'image/png' }), f2 = new File(['y'], 'b.pdf', { type: 'application/pdf' });
    act(() => result.current.add([f1, f2]));
    const [x1, x2] = FakeXHR.all;
    expect(x1!.url).toBe('/api/tickets/SC-1/attachments');
    expect((x1!.sent!.get('file') as File).name).toBe('a.png');
    act(() => x1!.upload.onprogress!({ lengthComputable: true, loaded: 50, total: 100 }));
    expect(result.current.items[0]!.progress).toBe(50);
    expect(result.current.busy).toBe(true);
    const att = { id: 'a1', name: 'a.png', size: 1, mime: 'image/png', url: '/api/attachments/a1' };
    await act(async () => x1!.respond(201, { attachment: att }));
    await act(async () => x2!.respond(413, { error: { code: 'FILE_TOO_LARGE', message: 'x' } }));
    expect(result.current.done).toEqual([att]);
    expect(result.current.items[1]!.error).toBe('Larger than 10 MB');
    expect(result.current.busy).toBe(false);
  });

  it('New ticket: pre-ticket upload then create sends attachmentIds', async () => {
    FakeXHR.all = [];
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const calls = routeFetch({ 'GET /api/auth/me': { body: { user } }, 'GET /api/notifications': noNotes,
      'POST /api/tickets': { status: 201, body: { ticket: ticket({ number: 'SC-9' }), messages: [msg()] } }, 'GET /api/tickets/SC-9': { body: { ticket: ticket({ number: 'SC-9' }) } } });
    localStorage.clear();
    const { router } = boot('/tickets/new');
    await userEvent.type(await screen.findByLabelText('Subject'), 'Invoice is wrong');
    await userEvent.type(screen.getByLabelText("What's happening?"), 'The GST number on my invoice is wrong.');
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    await userEvent.upload(input, new File(['x'], 'proof.png', { type: 'image/png' }));
    expect(FakeXHR.all[0]!.url).toBe('/api/attachments');
    expect((screen.getByRole('button', { name: 'Submit ticket' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => FakeXHR.all[0]!.respond(201, { attachment: { id: 'f'.repeat(24), name: 'proof.png', size: 1, mime: 'image/png', url: '/x' } }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets/SC-9'));
    const post = calls.find((c) => c.init.method === 'POST')!;
    expect(JSON.parse(post.init.body as string).attachmentIds).toEqual(['f'.repeat(24)]);
    expect(localStorage.getItem('scc-ticket-draft')).toBeNull();
  });
});

class FakeES {
  static last: FakeES;
  listeners: Record<string, (e: { data: string }) => void> = {};
  onopen?: () => void; onerror?: () => void;
  constructor() { FakeES.last = this; }
  addEventListener(t: string, f: (e: { data: string }) => void) { this.listeners[t] = f; }
  close() {}
  emit(t: string, d: unknown) { this.listeners[t]!({ data: JSON.stringify(d) }); }
}

describe('P5 bell + SSE', () => {
  it('shows unread, prepends live notifications, updates the tab title, marks read and opens the ticket', async () => {
    vi.stubGlobal('EventSource', FakeES);
    const n1 = { id: 'n1', type: 'agent_reply', ticketNumber: 'SC-7', title: 'New reply on SC-7', body: 'Hi', readAt: null, createdAt: new Date().toISOString() };
    const calls = routeFetch({ 'GET /api/notifications': { body: { items: [n1], unreadCount: 1, nextCursor: null } }, 'POST /api/notifications/read': { body: { unreadCount: 1 } } });
    const qc = newQc();
    let path = '';
    const Where = () => { path = useLocation().pathname; return null; };
    const Live = () => { useLiveEvents('u1'); return null; };
    document.title = 'Home · SmartCC';
    render(<><LiveBell /><Live /><Where /></>, { wrapper: wrap(qc) });
    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await waitFor(() => expect(document.title).toMatch(/^\(1\) .*SmartCC$/));

    const n2 = { ...n1, id: 'n2', title: 'SC-8 is resolved', ticketNumber: 'SC-8' };
    act(() => FakeES.last.emit('notification.created', { notification: n2, unreadCount: 2 }));
    expect(await screen.findByRole('button', { name: 'Notifications, 2 unread' })).toBe(bell);
    expect(document.title).toMatch(/^\(2\) /);

    await userEvent.click(bell);
    await userEvent.click(screen.getByRole('button', { name: /SC-8 is resolved/ }));
    await waitFor(() => expect(calls.some((c) => c.init.method === 'POST')).toBe(true));
    expect(JSON.parse(calls.find((c) => c.init.method === 'POST')!.init.body as string)).toEqual({ ids: ['n2'] });
    expect(path).toBe('/tickets/SC-8');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeTruthy());
  });
});

const sse = (...events: [string, unknown][]) => events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
function streamResponse(text: string, cut = 7) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += cut) c.enqueue(bytes.slice(i, i + cut)); c.close(); } }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}
const handlers = () => ({ onToken: vi.fn(), onSources: vi.fn(), onDone: vi.fn(), onError: vi.fn() });

describe('P6 assistant stream', () => {
  it('sseParser handles split chunks, comments, CRLF and multi-line data', () => {
    const got: { event: string; data: string }[] = [];
    const feed = sseParser((e) => got.push(e));
    feed('retry: 3000\n\n: ping\n\nevent: tok');
    feed('en\r\ndata: {"t":"a"}\r\n\r\nevent: x\ndata: 1\ndata: 2\n');
    expect(got).toEqual([{ event: 'token', data: '{"t":"a"}' }]);
    feed('\n');
    expect(got[1]).toEqual({ event: 'x', data: '1\n2' });
  });

  it('chatStream: tokens in order, sources, done; posts messages + locale', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamResponse(sse(['token', { t: 'Wait ' }], ['token', { t: '30 minutes' }],
      ['sources', { sources: [{ slug: 's', title: 'S' }] }], ['done', { suggestTicket: false }]))));
    const h = handlers();
    await chatStream([{ role: 'user', content: 'hi' }], 'hi', h);
    expect(h.onToken.mock.calls.map((c) => c[0]).join('')).toBe('Wait 30 minutes');
    expect(h.onSources).toHaveBeenCalledWith([{ slug: 's', title: 'S' }]);
    expect(h.onDone).toHaveBeenCalledWith({ suggestTicket: false });
    expect(h.onError).not.toHaveBeenCalled();
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(url).toBe('/api/assistant/chat');
    expect(JSON.parse(init.body as string)).toEqual({ messages: [{ role: 'user', content: 'hi' }], locale: 'hi' });
  });

  it('chatStream: mid-stream error event, and a stream that ends without done', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamResponse(sse(['token', { t: 'Par' }], ['error', { code: 'AI_UNAVAILABLE', message: 'The answer was interrupted.' }],
      ['sources', { sources: [] }], ['done', { suggestTicket: true }]))));
    const h = handlers();
    await chatStream([{ role: 'user', content: 'hi' }], 'en', h);
    expect(h.onError).toHaveBeenCalledWith('AI_UNAVAILABLE', 'The answer was interrupted.');
    expect(h.onDone).toHaveBeenCalledWith({ suggestTicket: true });

    vi.stubGlobal('fetch', vi.fn(async () => streamResponse(sse(['token', { t: 'Par' }]))));
    const h2 = handlers();
    await chatStream([{ role: 'user', content: 'hi' }], 'en', h2);
    expect(h2.onError).toHaveBeenCalled();
    expect(h2.onDone).toHaveBeenCalledWith({ suggestTicket: true });
  });

  it('useAssistant: 503 → unavailable banner, 429 → rate banner; streamed turn persists to sessionStorage', async () => {
    sessionStorage.clear();
    mockFetch({ status: 503, body: { error: { code: 'AI_UNAVAILABLE', message: 'x' } } });
    const { result } = renderHook(() => useAssistant('u1'));
    await act(() => result.current.send('My payment failed'));
    expect(result.current.banner).toEqual({ kind: 'unavailable' });
    expect(result.current.turns.map((t) => t.role)).toEqual(['user']);

    mockFetch({ status: 429, body: { error: { code: 'RATE_LIMITED', message: 'x' } }, headers: { 'Retry-After': '42' } });
    await act(() => result.current.send('again'));
    expect(result.current.banner).toEqual({ kind: 'rate', retryAfterS: 42 });

    vi.stubGlobal('fetch', vi.fn(async () => streamResponse(sse(['token', { t: 'Answer' }], ['sources', { sources: [] }], ['done', { suggestTicket: true }]))));
    await act(() => result.current.send('third'));
    const last = result.current.turns.at(-1)!;
    expect(last).toMatchObject({ role: 'assistant', content: 'Answer', suggestTicket: true, streaming: false });
    expect(JSON.parse(sessionStorage.getItem('scc-assistant:u1')!)).toHaveLength(4);
  });

  it('toTicket: subject from the first question, description = transcript', () => {
    const r = toTicket([{ id: '1', role: 'user', content: 'Plan  inactive\nafter payment' }, { id: '2', role: 'assistant', content: 'Wait 30 minutes.' }]);
    expect(r.subject).toBe('Plan inactive after payment');
    expect(r.description).toContain('You: Plan  inactive');
    expect(r.description).toContain('AI assistant: Wait 30 minutes.');
    expect(toTicket([{ id: '1', role: 'user', content: 'hi' }]).subject).toBe('Question from the AI assistant chat');
  });
});

describe('P7 locale', () => {
  afterEach(async () => { await act(() => loadLocale('en')); localStorage.clear(); });

  it('setLocale PATCHes /api/me when signed in, not when signed out', async () => {
    const calls = mockFetch({ body: { user: { ...user, locale: 'hi' } } });
    const qc = newQc();
    qc.setQueryData(['me'], user);
    const { result } = renderHook(() => useLocale(), { wrapper: wrap(qc) });
    await act(async () => result.current.setLocale('hi'));
    await waitFor(() => expect(i18n.language).toBe('hi'));
    expect(calls[0]!.url).toBe('/api/me');
    expect(calls[0]!.init.method).toBe('PATCH');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ locale: 'hi' });
    expect((qc.getQueryData(['me']) as typeof user).locale).toBe('hi');

    const calls2 = mockFetch();
    const qc2 = newQc();
    const { result: r2 } = renderHook(() => useLocale(), { wrapper: wrap(qc2) });
    await act(async () => r2.current.setLocale('en'));
    expect(calls2).toHaveLength(0);
  });

  it('the signed-in user\'s locale is applied by the shell; KB requests carry locale', async () => {
    const calls = routeFetch({ 'GET /api/auth/me': { body: { user: { ...user, locale: 'hi' } } }, 'GET /api/notifications': noNotes,
      'GET /api/kb/articles': { body: { items: [] } } });
    boot('/help');
    await waitFor(() => expect(i18n.language).toBe('hi'));
    await waitFor(() => expect(calls.some((c) => c.url.startsWith('/api/kb/articles?locale=hi'))).toBe(true));
  });
});

describe('P8 helpers', () => {
  it('password strength, reading time, search highlight', () => {
    expect(strength('short')).toBe(0);
    expect(strength('abcdefgh')).toBe(1);
    expect(strength('Abcdefgh1!xyz')).toBe(4);
    expect(readMinutes('word '.repeat(450))).toBe(2);
    expect(readMinutes('')).toBe(1);
    const { container } = render(<p><Highlight text="Refund status for GST refunds" q="refund gst (" /></p>);
    expect([...container.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Refund', 'GST', 'refund']);
  });

  it('register shows a strength meter and a show-password toggle', async () => {
    render(<AuthForm mode="register" onSubmit={() => {}} />);
    const pw = await screen.findByLabelText('Password');
    await userEvent.type(pw, 'Abcdefgh1!xyz');
    expect(screen.getByText('Password strength: strong')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw.getAttribute('type')).toBe('text');
  });
});
