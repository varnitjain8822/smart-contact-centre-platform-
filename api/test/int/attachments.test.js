import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { sweepOrphans } from '../../src/attachments/service.js';
import { cfg } from '../../src/config.js';
import { Attachment } from '../../src/models/Attachment.js';
import { Message } from '../../src/models/Message.js';
import { Ticket } from '../../src/models/Ticket.js';
import { tick } from '../../src/sync/worker.js';
import { newTicket, setup, signed, signUp, until } from '../helpers.js';
import { startDb, stopDb } from '../db.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]), Buffer.alloc(64)]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]);
let app, cw, a, b, number;
beforeAll(async () => {
  await startDb(); ({ app, chatwoot: cw } = await setup());
  a = await signUp(app); b = await signUp(app, 'Other User');
  number = (await newTicket(a).expect(201)).body.ticket.number;
});
afterAll(stopDb);
beforeEach(() => cw.reset());

const up = (agent, buf, name, path = `/api/tickets/${number}/attachments`) => agent.post(path).attach('file', buf, name);

test('upload to a ticket → 201 DTO; owner can download (inline image), others 404, anonymous 401', async () => {
  const r = await up(a, PNG, 'screen shot.png').expect(201);
  expect(r.body.attachment).toEqual({ id: expect.stringMatching(/^[a-f0-9]{24}$/), name: 'screen shot.png', size: PNG.length, mime: 'image/png',
    url: `/api/attachments/${r.body.attachment.id}` });
  const doc = await Attachment.findById(r.body.attachment.id);
  const t = await Ticket.findOne({ number });
  expect(doc.path.startsWith(`${t._id}/`)).toBe(true);
  expect(readFileSync(join(cfg.UPLOAD_DIR, doc.path)).equals(PNG)).toBe(true);
  const g = await a.get(r.body.attachment.url).expect(200);
  expect(g.headers['content-type']).toBe('image/png');
  expect(g.headers['content-disposition']).toMatch(/^inline; filename="screen shot.png"/);
  expect(g.headers['content-security-policy']).toContain('sandbox');
  expect(Buffer.from(g.body).equals(PNG)).toBe(true);
  await b.get(r.body.attachment.url).expect(404);
  await request(app).get(r.body.attachment.url).expect(401);
  await a.get('/api/attachments/not-an-id').expect(404);
  await up(b, PNG, 'x.png').expect(404);   // not b's ticket
});

test('magic-byte validation: pdf/txt ok; exe, renamed binary, fake .png → 415; >10 MB → 413; no file → 400; foreign origin → 403', async () => {
  expect((await up(a, PDF, 'invoice.pdf').expect(201)).body.attachment.mime).toBe('application/pdf');
  const txt = (await up(a, Buffer.from('नमस्ते, order 42\n'), 'notes.txt').expect(201)).body.attachment;
  expect(txt.mime).toBe('text/plain');
  expect((await a.get(txt.url).expect(200)).headers['content-disposition']).toMatch(/^attachment/);
  expect((await up(a, EXE, 'cute.png').expect(415)).body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  await up(a, Buffer.from('hello\0world'), 'notes.txt').expect(415);
  await up(a, Buffer.from('<html><script>alert(1)</script>'), 'page.png').expect(415);
  expect((await up(a, Buffer.alloc(10 * 1024 * 1024 + 1), 'big.txt').expect(413)).body.error.code).toBe('FILE_TOO_LARGE');
  expect((await a.post(`/api/tickets/${number}/attachments`).field('x', '1').expect(400)).body.error.code).toBe('VALIDATION_FAILED');
  await a.post(`/api/tickets/${number}/attachments`).send({}).expect(400);
  await a.post(`/api/tickets/${number}/attachments`).set('Origin', 'http://evil.test').attach('file', PNG, 'a.png').expect(403);
  await a.post(`/api/tickets/${number}/messages`).attach('file', PNG, 'a.png').expect(415);   // multipart only on upload routes
});

test('message with attachmentIds → DTO attachments + Chatwoot multipart; ids single-use and owner-only', async () => {
  const id = (await up(a, PNG, 'proof.png').expect(201)).body.attachment.id;
  const r = await a.post(`/api/tickets/${number}/messages`).send({ body: 'See screenshot', clientMessageId: randomUUID(), attachmentIds: [id] }).expect(201);
  expect(r.body.message.attachments).toEqual([{ id, name: 'proof.png', size: PNG.length, mime: 'image/png', url: `/api/attachments/${id}` }]);
  expect(r.body.message.deliveryState).toBe('sent');
  const [, , p] = cw.named('createMessage')[0];
  expect(p).toMatchObject({ content: 'See screenshot', messageType: 'incoming' });
  expect(p.attachments).toHaveLength(1);
  expect(p.attachments[0]).toMatchObject({ name: 'proof.png', mime: 'image/png' });
  expect(p.attachments[0].buffer.equals(PNG)).toBe(true);
  const listed = (await a.get(`/api/tickets/${number}/messages`).expect(200)).body.items.at(-1);
  expect(listed.attachments[0].id).toBe(id);
  // reuse → 400; someone else's id → 400; too many → 400
  expect((await a.post(`/api/tickets/${number}/messages`).send({ body: 'again', clientMessageId: randomUUID(), attachmentIds: [id] }).expect(400)).body.error.code).toBe('INVALID_ATTACHMENT');
  const foreign = (await up(b, PNG, 'b.png', '/api/attachments').expect(201)).body.attachment.id;
  await a.post(`/api/tickets/${number}/messages`).send({ body: 'x', clientMessageId: randomUUID(), attachmentIds: [foreign] }).expect(400);
  await a.post(`/api/tickets/${number}/messages`).send({ body: 'x', clientMessageId: randomUUID(), attachmentIds: Array(6).fill(foreign) }).expect(400);
});

test('new ticket: upload first (POST /api/attachments), create with attachmentIds → files move to <ticketId>/, sent to Chatwoot after the conversation', async () => {
  const pre = (await up(a, PDF, 'invoice.pdf', '/api/attachments').expect(201)).body.attachment;
  expect((await Attachment.findById(pre.id)).path.startsWith('pending/')).toBe(true);
  const r = await newTicket(a, { attachmentIds: [pre.id] }).expect(201);
  expect(r.body.messages[0].attachments).toEqual([pre]);
  expect(r.body.messages[0].deliveryState).toBe('sent');
  const t = await Ticket.findOne({ number: r.body.ticket.number });
  const doc = await Attachment.findById(pre.id);
  expect(doc.path.startsWith(`${t._id}/`)).toBe(true);
  expect(existsSync(join(cfg.UPLOAD_DIR, doc.path))).toBe(true);
  const order = cw.calls.map((c) => c[0]);
  expect(order.indexOf('createConversation')).toBeLessThan(order.indexOf('createMessage'));
  const [, convId, p] = cw.named('createMessage')[0];
  expect(convId).toBe(t.chatwoot.conversationId);
  expect(p.content).toBeUndefined();   // the description already went in createConversation
  expect(p.attachments[0].name).toBe('invoice.pdf');
});

test('new ticket with attachments while Chatwoot is down → opener pending; worker delivers conversation then files', async () => {
  const pre = (await up(a, PNG, 'late.png', '/api/attachments').expect(201)).body.attachment;
  cw.down = true;
  const r = await newTicket(a, { attachmentIds: [pre.id] }).expect(201);
  expect(r.body.messages[0].deliveryState).toBe('pending');
  cw.down = false;
  const t = await Ticket.findOne({ number: r.body.ticket.number });
  await Ticket.updateOne({ _id: t._id }, { $set: { 'chatwoot.nextAttemptAt': new Date() } });
  await Message.updateOne({ ticketId: t._id }, { $set: { nextAttemptAt: new Date() } });
  await tick();
  expect((await Message.findOne({ ticketId: t._id })).syncState).toBe('sent');
  expect(cw.named('createMessage').at(-1)[2].attachments[0].name).toBe('late.png');
});

test('agent attachment via webhook → downloaded, stored, linked to the message, downloadable by the owner only', async () => {
  const t = await Ticket.findOne({ number });
  const url = 'http://localhost:3000/rails/active_storage/blobs/redirect/xyz/receipt.pdf';
  cw.files = { [url]: { buffer: PDF, contentType: 'application/pdf' } };
  const p = { event: 'message_created', id: 5551, content: null, message_type: 'outgoing', private: false, created_at: new Date().toISOString(),
    sender: { name: 'Asha', type: 'user' }, conversation: { id: t.chatwoot.conversationId },
    attachments: [{ id: 77, file_type: 'file', extension: 'pdf', data_url: url, file_size: PDF.length }] };
  await signed(app, '/webhooks/chatwoot', p, 'inbox-secret').expect(200);
  const m = await until(async () => { const x = await Message.findOne({ chatwootMessageId: 5551 }); return x?.attachments.length && x; });
  expect(m.body).toBe('(Attachment)');
  expect(m.attachments[0]).toMatchObject({ name: 'receipt.pdf', mime: 'application/pdf', size: PDF.length });
  const dl = await a.get(`/api/attachments/${m.attachments[0].id}`).expect(200);
  expect(dl.headers['content-type']).toBe('application/pdf');
  expect(dl.headers['content-disposition']).toMatch(/^attachment; filename="?receipt.pdf"?/);
  await b.get(`/api/attachments/${m.attachments[0].id}`).expect(404);
  expect(cw.named('downloadAttachment')[0].slice(1)).toEqual([url, 10 * 1024 * 1024]);
  // redelivery of the same Chatwoot attachment does not duplicate
  await signed(app, '/webhooks/chatwoot', { ...p, id: 5552 }, 'inbox-secret').expect(200);
  await until(() => Message.findOne({ chatwootMessageId: 5552 }));
  await new Promise((r) => setTimeout(r, 50));
  expect(await Attachment.countDocuments({ chatwootAttachmentId: 77 })).toBe(1);
});

test('transcript: text/plain download with every message and attachment line; owner only; txt only', async () => {
  const r = await a.get(`/api/tickets/${number}/transcript?format=txt`).expect(200);
  expect(r.headers['content-type']).toBe('text/plain; charset=utf-8');
  expect(r.headers['content-disposition']).toBe(`attachment; filename=${number}-transcript.txt`);
  expect(r.text).toContain(`SmartCC ticket ${number}`);
  expect(r.text).toContain('Subject: Payment deducted but plan inactive');
  expect(r.text).toMatch(/\] Priya Shah \(You\):\nI paid 4999/);
  expect(r.text).toContain('See screenshot');
  expect(r.text).toContain('  Attachment: proof.png (image/png');
  expect(r.text).toContain('Asha (Agent)');
  await a.get(`/api/tickets/${number}`).expect(200);
  await b.get(`/api/tickets/${number}/transcript`).expect(404);
  await a.get(`/api/tickets/${number}/transcript?format=pdf`).expect(400);
});

test('orphan sweep removes unsent uploads older than 24 h', async () => {
  const id = (await up(a, PNG, 'forgotten.png', '/api/attachments').expect(201)).body.attachment.id;
  const doc = await Attachment.findById(id);
  expect(await sweepOrphans(new Date())).toBe(0);
  expect(await sweepOrphans(new Date(Date.now() + 25 * 3600_000))).toBeGreaterThanOrEqual(1);
  expect(await Attachment.findById(id)).toBeNull();
  expect(existsSync(join(cfg.UPLOAD_DIR, doc.path))).toBe(false);
});
