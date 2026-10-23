import { afterEach, expect, test, vi } from 'vitest';
import * as cw from '../../src/chatwoot/client.js';

const base = 'http://chatwoot.test/api/v1/accounts/1';
let calls;
const stub = (status = 200, body = {}) => {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, init) => { calls.push({ url, method: init.method, token: init.headers.api_access_token,
    body: init.body && JSON.parse(init.body) }); return new Response(JSON.stringify(body), { status }); }));
};
afterEach(() => vi.unstubAllGlobals());

test.each([
  ['createConversation', () => cw.createConversation({ sourceId: 's', contactId: 2, ticketNumber: 'SC-1', slaDueAt: 'd', content: 'c' }),
    '/conversations', 'POST', 'admin-tok', { source_id: 's', inbox_id: '7', contact_id: 2, custom_attributes: { ticket_number: 'SC-1', sla_due_at: 'd' }, message: { content: 'c', message_type: 'incoming' } }],
  ['createMessage bot private', () => cw.createMessage(5, { content: 'n', isPrivate: true }, 'bot'),
    '/conversations/5/messages', 'POST', 'bot-tok', { content: 'n', message_type: 'outgoing', private: true }],
  ['createMessage incoming admin', () => cw.createMessage(5, { content: 'n', messageType: 'incoming' }),
    '/conversations/5/messages', 'POST', 'admin-tok', { content: 'n', message_type: 'incoming', private: false }],
  ['toggleStatus', () => cw.toggleStatus(5, 'open', 'bot'), '/conversations/5/toggle_status', 'POST', 'bot-tok', { status: 'open' }],
  ['togglePriority', () => cw.togglePriority(5, 'urgent'), '/conversations/5/toggle_priority', 'POST', 'bot-tok', { priority: 'urgent' }],
  ['setLabels', () => cw.setLabels(5, ['a']), '/conversations/5/labels', 'POST', 'bot-tok', { labels: ['a'] }],
  ['setCustomAttributes admin', () => cw.setCustomAttributes(5, { csat: 4 }, 'admin'), '/conversations/5/custom_attributes', 'POST', 'admin-tok', { custom_attributes: { csat: 4 }, merge: true }],
  ['setCustomAttributes bot', () => cw.setCustomAttributes(5, { x: 1 }), '/conversations/5/custom_attributes', 'POST', 'bot-tok', { custom_attributes: { x: 1 }, merge: true }],
  ['getConversation', () => cw.getConversation(5), '/conversations/5', 'GET', 'admin-tok', undefined],
  ['listMessages', () => cw.listMessages(5), '/conversations/5/messages', 'GET', 'admin-tok', undefined],
])('%s', async (_, fn, path, method, token, body) => {
  stub(200, { payload: [] });
  await fn();
  expect(calls[0]).toEqual({ url: base + path, method, token, body });
});

test('createContact maps ids', async () => {
  stub(200, { payload: { contact: { id: 9 }, contact_inbox: { source_id: 'src' } } });
  expect(await cw.createContact({ name: 'n', email: 'e', identifier: 'u1' })).toEqual({ contactId: 9, sourceId: 'src' });
  expect(calls[0]).toMatchObject({ url: `${base}/contacts`, method: 'POST', body: { inbox_id: '7', name: 'n', email: 'e', identifier: 'u1' } });
});

test('non-2xx → ChatwootError', async () => {
  stub(422, { error: 'x' });
  await expect(cw.getConversation(1)).rejects.toMatchObject({ name: 'Error', status: 422, path: '/conversations/1' });
});

test('aborts after CHATWOOT_TIMEOUT_MS', async () => {
  vi.stubGlobal('fetch', (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason))));
  await expect(cw.getConversation(1)).rejects.toMatchObject({ name: 'TimeoutError' });
});
