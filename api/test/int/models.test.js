import { afterAll, beforeAll, expect, test } from 'vitest';
import { Ticket } from '../../src/models/Ticket.js';
import { Message } from '../../src/models/Message.js';
import { User } from '../../src/models/User.js';
import { KbArticle } from '../../src/models/KbArticle.js';
import { WebhookDelivery } from '../../src/models/WebhookDelivery.js';
import { nextTicketNumber } from '../../src/models/Counter.js';
import { startDb, stopDb } from '../db.js';

beforeAll(startDb);
afterAll(stopDb);

const idx = async (m) => Object.fromEntries((await m.collection.indexes()).map((i) => [i.name, i]));

test('indexes per lld §2.2', async () => {
  const t = await idx(Ticket);
  expect(t.number_1.unique).toBe(true);
  expect(t['customerId_1_updatedAt_-1']).toBeTruthy();
  expect(t['chatwoot.conversationId_1'].partialFilterExpression).toEqual({ 'chatwoot.conversationId': { $type: 'number' } });
  expect(t.customerId_1_idempotencyKey_1.unique).toBe(true);
  expect(t['chatwoot.syncState_1_chatwoot.nextAttemptAt_1']).toBeTruthy();
  expect(t['status_1_ai.pendingSince_1']).toBeTruthy();
  expect(t['status_1_sla.breachedAt_1']).toBeTruthy();
  const m = await idx(Message);
  expect(m.chatwootMessageId_1.unique).toBe(true);
  expect(m.ticketId_1_clientMessageId_1.partialFilterExpression).toEqual({ clientMessageId: { $type: 'string' } });
  expect(m.syncState_1_nextAttemptAt_1.partialFilterExpression).toEqual({ syncState: 'pending' });
  expect(m.ticketId_1_createdAt_1).toBeTruthy();
  // v4 tenancy: unique per company
  expect((await idx(User)).companyId_1_email_1).toMatchObject({ unique: true, partialFilterExpression: { email: { $type: 'string' } } });
  const k = await idx(KbArticle);
  expect(k.kb_text_company.weights).toEqual({ title: 10, keywords: 5, body: 1 });
  expect(k.kb_text_company.key).toMatchObject({ companyId: 1 });
  expect(k.companyId_1_slug_1.unique).toBe(true);
  expect(k.companyId_1_category_1_title_1).toBeTruthy();
  expect(t['companyId_1_createdAt_-1']).toBeTruthy();
  expect((await idx(WebhookDelivery)).receivedAt_1.expireAfterSeconds).toBe(604800);
});

test('nextTicketNumber is sequential from SC-1001', async () => {
  expect(await nextTicketNumber()).toBe('SC-1001');
  expect(await nextTicketNumber()).toBe('SC-1002');
});

test('partial uniques allow many nulls', async () => {
  const id = new Ticket()._id;
  await Message.create([{ ticketId: id, author: 'system', body: 'a' }, { ticketId: id, author: 'system', body: 'b' }]);
  await expect(Message.create([{ ticketId: id, author: 'agent', body: 'c', chatwootMessageId: 5 },
    { ticketId: id, author: 'agent', body: 'd', chatwootMessageId: 5 }])).rejects.toThrow(/E11000/);
});
