import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { future, routes } from '../src/routes';
import { ToastProvider } from '../src/ui/Toast';
import { useLiveEvents } from '../src/lib/live';
import { useTyping } from '../src/features/tickets/hooks';
import { Thread } from '../src/features/tickets/Thread';
import { AuthForm } from '../src/features/auth/AuthForm';
import { msg, newQc, routeFetch, wrap } from './helpers';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const user = { id: 'u1', name: 'Priya Shah', email: 'p@x.co', createdAt: '', locale: 'en', phone: null, organization: null,
  notify: { email: { reply: true, status: true, sla: true }, inApp: true } };
const noNotes = { body: { items: [], unreadCount: 0, nextCursor: null } };
const article = { slug: 'refund-status', title: 'Refund status', category: 'Billing', excerpt: 'x', updatedAt: '2026-10-15T10:00:00.000Z',
  body: 'Refunds take 5 days.', locale: 'en', views: 3, helpfulCount: 2, notHelpfulCount: 0, myVote: null };

function boot(path: string) {
  vi.stubGlobal('EventSource', class { addEventListener() {} close() {} });
  const qc = newQc();
  const router = createMemoryRouter(routes, { initialEntries: [path], future });
  render(<QueryClientProvider client={qc}><ToastProvider><RouterProvider router={router} future={{ v7_startTransition: true }} /></ToastProvider></QueryClientProvider>);
  return { qc, router };
}

describe('agent typing', () => {
  class FakeES {
    static last: FakeES;
    listeners: Record<string, (e: { data: string }) => void> = {};
    constructor() { FakeES.last = this; }
    addEventListener(t: string, f: (e: { data: string }) => void) { this.listeners[t] = f; }
    close() {}
    emit(t: string, d: unknown) { this.listeners[t]!({ data: JSON.stringify(d) }); }
  }
  it('SSE typing on/off drives useTyping; auto-clears after 30 s; an agent message clears it', () => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeES);
    const qc = newQc();
    renderHook(() => useLiveEvents('u1'), { wrapper: wrap(qc) });
    const { result } = renderHook(() => useTyping('SC-1'), { wrapper: wrap(qc) });
    // react-query notifies observers on a 0 ms timer: flush it with the fake clock
    const emit = (t: string, d: unknown) => act(() => { FakeES.last.emit(t, d); vi.advanceTimersByTime(1); });
    expect(result.current).toBeNull();
    emit('typing', { ticketNumber: 'SC-1', on: true, name: 'Asha' });
    expect(result.current).toBe('Asha');
    emit('typing', { ticketNumber: 'SC-1', on: false, name: 'Asha' });
    expect(result.current).toBeNull();
    emit('typing', { ticketNumber: 'SC-1', on: true, name: 'Asha' });
    act(() => { vi.advanceTimersByTime(29_000); });
    expect(result.current).toBe('Asha');
    act(() => { vi.advanceTimersByTime(1_100); });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBeNull();
    emit('typing', { ticketNumber: 'SC-1', on: true, name: 'Asha' });
    emit('message.created', { ticketNumber: 'SC-1', message: msg({ id: 'z', author: 'agent' }) });
    expect(result.current).toBeNull();
  });
  it('Thread shows "<name> is typing…" inside the live log', () => {
    const { rerender } = render(<Thread messages={[msg()]} onRetry={() => {}} typing="Asha" />, { wrapper: wrap() });
    expect(within(screen.getByRole('log')).getByText('Asha is typing…')).toBeTruthy();
    rerender(<Thread messages={[msg()]} onRetry={() => {}} typing="" />);
    expect(screen.getByText('An agent is typing…')).toBeTruthy();
    rerender(<Thread messages={[msg()]} onRetry={() => {}} typing={null} />);
    expect(screen.queryByText(/typing/)).toBeNull();
  });
});

describe('KB helpful vote (server)', () => {
  it('signed in: vote is POSTed and the returned counts/myVote are shown', async () => {
    const calls = routeFetch({
      'GET /api/auth/me': { body: { user } }, 'GET /api/notifications': noNotes, 'GET /api/kb/articles?': { body: { items: [] } },
      'GET /api/kb/articles/refund-status': { body: { article } },
      'POST /api/kb/articles/refund-status/feedback': { body: { feedback: { helpfulCount: 3, notHelpfulCount: 0, myVote: true } } },
    });
    boot('/help/refund-status');
    expect(await screen.findByText('2 people found this helpful')).toBeTruthy();
    const yes = screen.getByRole('button', { name: 'Yes' });
    expect(yes.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(yes);
    await screen.findByText('3 people found this helpful');
    expect(screen.getByRole('button', { name: 'Yes' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Thanks — glad it helped.')).toBeTruthy();
    const post = calls.find((c) => c.init.method === 'POST' && c.url.includes('/feedback'))!;
    expect(JSON.parse(String(post.init.body))).toEqual({ helpful: true });
  });
  it('signed out: a sign-in link instead of the buttons', async () => {
    routeFetch({ 'GET /api/auth/me': { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'x' } } }, 'GET /api/kb/articles?': { body: { items: [] } },
      'GET /api/kb/articles/refund-status': { body: { article } } });
    boot('/help/refund-status');
    const link = await screen.findByRole('link', { name: 'Sign in to rate this article' });
    expect(link.getAttribute('href')).toBe('/login?next=%2Fhelp%2Frefund-status');
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull();
  });
});

describe('remember me', () => {
  it('login submits remember (unticked by default)', async () => {
    const submit = vi.fn();
    render(<AuthForm mode="login" onSubmit={submit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'p@x.co');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'longenough');
    const box = screen.getByRole('checkbox', { name: 'Remember me' });
    expect((box as HTMLInputElement).checked).toBe(false);
    await userEvent.click(box);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ email: 'p@x.co', remember: true }));
  });
});

describe('Profile', () => {
  it('phone validated client-side; changed details PATCHed normalised; sign out other devices confirms then toasts', async () => {
    const calls = routeFetch({
      'GET /api/auth/me': { body: { user } }, 'GET /api/notifications': noNotes,
      'PATCH /api/me': (_u, init) => ({ body: { user: { ...user, ...JSON.parse(String(init.body)) } } }),
      'POST /api/auth/logout-others': { status: 204 },
    });
    boot('/profile');
    const phone = await screen.findByLabelText(/^Phone/);
    await userEvent.type(phone, '98765');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByText('Use international format, e.g. +91 98765 43210')).toBeTruthy();
    await userEvent.clear(phone);
    await userEvent.type(phone, '+91 98765-43210');
    await userEvent.type(screen.getByLabelText(/^Organisation/), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await screen.findByText('Details saved');
    const patch = calls.find((c) => c.init.method === 'PATCH')!;
    expect(JSON.parse(String(patch.init.body))).toEqual({ phone: '+919876543210', organization: 'Acme' });

    await userEvent.click(screen.getByRole('button', { name: 'Sign out other devices' }));
    const dlg = screen.getByRole('dialog', { name: 'Sign out other devices?' });
    expect(calls.some((c) => c.url.includes('logout-others'))).toBe(false);
    await userEvent.click(within(dlg).getByRole('button', { name: 'Sign out other devices' }));
    await screen.findByText('Other devices signed out');
    await waitFor(() => expect(calls.filter((c) => c.url.includes('logout-others'))).toHaveLength(1));
  });
});
