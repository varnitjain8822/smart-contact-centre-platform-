import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { Message, TicketDetail } from '../src/lib/types';

export const newQc = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

export function wrap(qc = newQc(), path = '/') {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter></QueryClientProvider>
  );
}

/** Queue of fetch responses; records calls. */
export function mockFetch(...responses: { status?: number; body?: unknown; headers?: Record<string, string> }[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { status: 200, body: {} };
    const status = r.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(r.body ?? {}), { status, headers: r.headers });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

export const msg = (p: Partial<Message> = {}): Message => ({
  id: 'm1', ticketNumber: 'SC-1', author: 'customer', authorName: 'Priya', body: 'hi', sources: [],
  createdAt: '2026-10-15T10:00:00.000Z', clientMessageId: null, deliveryState: 'sent', ...p,
});

export const ticket = (p: Partial<TicketDetail> = {}): TicketDetail => ({
  number: 'SC-1', subject: 'Payment deducted', status: 'ai_handling', priority: 'medium', category: 'Billing',
  createdAt: '2026-10-15T10:00:00.000Z', updatedAt: '2026-10-15T10:00:00.000Z', lastMessageAt: '2026-10-15T10:00:00.000Z',
  sla: { responseDueAt: '2026-10-15T11:00:00.000Z', resolutionDueAt: '2026-10-16T10:00:00.000Z', firstResponseAt: null,
    resolvedAt: null, activeDueAt: '2026-10-15T11:00:00.000Z', state: 'on_track' },
  aiTier: null, delivery: 'synced', description: 'x'.repeat(20), customerCategory: null, resolutionType: null, csat: null,
  statusHistory: [], ai: { confidence: null, triggers: [] },
  actions: { canAccept: false, canRequestHuman: true, canResolve: true, canRate: false }, ...p,
});

/** Fetch mock routed by "METHOD /path" prefix (first match wins; longest keys first is the caller's job). Records calls. */
export function routeFetch(routes: Record<string, { status?: number; body?: unknown } | ((url: string, init: RequestInit) => { status?: number; body?: unknown })>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const method = (init.method ?? 'GET').toUpperCase();
    const hit = Object.entries(routes).find(([k]) => { const [m, p] = k.split(' '); return m === method && url.startsWith(p!); });
    const r0 = hit ? hit[1] : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nf' } } };
    const r = typeof r0 === 'function' ? r0(url, init) : r0;
    const status = r.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(r.body ?? {}), { status });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

export const summary = (n: string, p: Partial<TicketDetail> = {}) => ({ ...ticket({ number: n, ...p }) });
