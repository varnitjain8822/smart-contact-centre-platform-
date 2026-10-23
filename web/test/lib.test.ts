import { describe, expect, it, vi } from 'vitest';
import { upsertMessage } from '../src/lib/cache';
import { countdown, slaView } from '../src/lib/format';
import { validate, safeNext, fieldErrors } from '../src/lib/validate';
import { api, ApiError } from '../src/lib/api';
import { onUnauthenticated } from '../src/lib/queryClient';
import { QueryClient } from '@tanstack/react-query';
import { mockFetch, msg } from './helpers';

describe('upsertMessage', () => {
  it('inserts in createdAt order', () => {
    const a = msg({ id: 'a', createdAt: '2026-01-01T00:00:02Z' });
    const b = msg({ id: 'b', createdAt: '2026-01-01T00:00:01Z' });
    expect(upsertMessage([a], b).map((m) => m.id)).toEqual(['b', 'a']);
  });
  it('replaces by id (no duplicate)', () => {
    const l = upsertMessage([msg({ id: 'a', body: 'v1' })], msg({ id: 'a', body: 'v2' }));
    expect(l).toHaveLength(1);
    expect(l[0]!.body).toBe('v2');
  });
  it('replaces the optimistic temp by clientMessageId', () => {
    const tmp = { ...msg({ id: 'tmp-c1', clientMessageId: 'c1', deliveryState: 'pending' }), localState: 'failed' as const };
    const l = upsertMessage([tmp], msg({ id: 'real', clientMessageId: 'c1' }));
    expect(l).toEqual([msg({ id: 'real', clientMessageId: 'c1' })]);
  });
  it('defaults to an empty list', () => expect(upsertMessage(undefined, msg())).toHaveLength(1));
});

describe('countdown (§15a)', () => {
  it.each([
    [2 * 3600_000 + 10 * 60_000, '2h 10m left'],
    [12 * 60_000 + 5000, '12m left'],
    [30_000, '<1m left'],
    [-3 * 60_000, 'Breached 3m ago'],
  ])('%i → %s', (ms, s) => expect(countdown(ms)).toBe(s));

  const base = { responseDueAt: '', resolutionDueAt: '', firstResponseAt: null, resolvedAt: null };
  const start = '2026-01-01T00:00:00Z', due = '2026-01-01T01:00:00Z', at = (m: number) => Date.parse(due) - m * 60_000;
  it('maps state to tone + text + label', () => {
    expect(slaView({ ...base, activeDueAt: due, state: 'on_track' }, at(30), start)).toMatchObject({ tone: 'ok', text: '30m left', fraction: 0.5 });
    expect(slaView({ ...base, activeDueAt: due, state: 'at_risk' }, at(4), start))
      .toMatchObject({ tone: 'warn', text: 'At risk · 4m', label: 'SLA: at risk, first response due in 4 minutes' });
    expect(slaView({ ...base, activeDueAt: due, state: 'breached' }, at(-3), start)).toMatchObject({ tone: 'bad', text: 'Breached 3m ago' });
    expect(slaView({ ...base, activeDueAt: null, state: 'met' }, 0, start)).toMatchObject({ tone: 'done', text: 'Met' });
    expect(slaView({ ...base, activeDueAt: null, state: 'breached' }, 0, start)).toMatchObject({ tone: 'bad', text: 'Missed' });
  });
});

describe('validate', () => {
  it('mirrors server rules', () => {
    expect(validate.name(' a ')).toBeTruthy();
    expect(validate.name('Priya')).toBeUndefined();
    expect(validate.email('a@b')).toBeTruthy();
    expect(validate.email('a@b.co')).toBeUndefined();
    expect(validate.password('1234567')).toBeTruthy();
    expect(validate.subject('abcd')).toBeTruthy();
    expect(validate.description('x'.repeat(19))).toBeTruthy();
    expect(validate.description('x'.repeat(20))).toBeUndefined();
  });
  it('maps server details by path', () => expect(fieldErrors([{ path: 'email', message: 'bad' }])).toEqual({ email: 'bad' }));
  it('safeNext only accepts ^/(?!/)', () => {
    expect(safeNext('/tickets/SC-1')).toBe('/tickets/SC-1');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});

describe('api', () => {
  it('ApiError carries code, details and Retry-After', async () => {
    mockFetch({ status: 429, body: { error: { code: 'RATE_LIMITED', message: 'slow' } }, headers: { 'Retry-After': '12' } });
    const e = await api.login({ email: 'a@b.co', password: 'x' }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterS: 12 });
  });
  it('sends JSON {} for actions and Idempotency-Key on create', async () => {
    const calls = mockFetch({ body: { ticket: {} } }, { status: 201, body: {} });
    await api.action('SC-1', 'accept');
    await api.createTicket({ subject: 's', description: 'd', category: null }, 'key-12345');
    expect(calls[0]!.init.body).toBe('{}');
    expect((calls[0]!.init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((calls[1]!.init.headers as Record<string, string>)['Idempotency-Key']).toBe('key-12345');
  });
});

describe('global 401 handler', () => {
  const e401 = new ApiError(401, 'UNAUTHENTICATED', 'x');
  it("skips the ['me'] query and INVALID_CREDENTIALS", () => {
    const qc = new QueryClient();
    const clear = vi.spyOn(qc, 'clear');
    onUnauthenticated(qc, e401, ['me']);
    onUnauthenticated(qc, new ApiError(401, 'INVALID_CREDENTIALS', 'x'));
    expect(clear).not.toHaveBeenCalled();
  });
  it('clears cache and redirects with next for other queries', () => {
    const qc = new QueryClient();
    const clear = vi.spyOn(qc, 'clear');
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/tickets/SC-1', search: '', assign });
    onUnauthenticated(qc, e401, ['ticket', 'SC-1']);
    expect(clear).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('/login?next=%2Ftickets%2FSC-1');
    vi.unstubAllGlobals();
  });
});
