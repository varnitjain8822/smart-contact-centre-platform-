import { afterEach, expect, test, vi } from 'vitest';
import * as cw from '../../src/chatwoot/client.js';

afterEach(() => vi.unstubAllGlobals());

test('createMessage with attachments → multipart attachments[] (no JSON content-type), opener without content', async () => {
  const f = vi.fn(async () => new Response(JSON.stringify({ id: 9 }), { status: 200 }));
  vi.stubGlobal('fetch', f);
  const r = await cw.createMessage(5, { messageType: 'incoming', sourceId: 'smartcc-1', attachments: [{ name: 'shot.png', mime: 'image/png', buffer: Buffer.from('png') }] });
  expect(r).toEqual({ id: 9 });
  const [url, init] = f.mock.calls[0];
  expect(url).toBe('http://chatwoot.test/api/v1/accounts/1/conversations/5/messages');
  expect(init.headers['Content-Type']).toBeUndefined();
  expect(init.headers.api_access_token).toBe('admin-tok');
  expect(init.body).toBeInstanceOf(FormData);
  expect(init.body.has('content')).toBe(false);
  expect(init.body.get('message_type')).toBe('incoming');
  expect(init.body.get('private')).toBe('false');
  expect(init.body.get('source_id')).toBe('smartcc-1');
  const file = init.body.getAll('attachments[]')[0];
  expect(file.name).toBe('shot.png');
  expect(file.type).toBe('image/png');
  expect(Buffer.from(await file.arrayBuffer()).toString()).toBe('png');
});

test('downloadAttachment: only Active Storage paths, always fetched from CHATWOOT_URL, size-capped', async () => {
  const f = vi.fn(async () => new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } }));
  vi.stubGlobal('fetch', f);
  const r = await cw.downloadAttachment('http://localhost:3000/rails/active_storage/blobs/redirect/abc/report.pdf?x=1', 100);
  expect(r.buffer.toString()).toBe('hello');
  expect(String(f.mock.calls[0][0])).toBe('http://chatwoot.test/rails/active_storage/blobs/redirect/abc/report.pdf?x=1');
  await expect(cw.downloadAttachment('http://169.254.169.254/latest/meta-data', 100)).rejects.toThrow('unexpected_attachment_url');
  await expect(cw.downloadAttachment('http://x/rails/active_storage/blobs/a', 3)).rejects.toThrow('attachment_too_large');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200, headers: { 'content-length': '999' } })));
  await expect(cw.downloadAttachment('http://x/rails/active_storage/blobs/a', 100)).rejects.toThrow('attachment_too_large');
});
