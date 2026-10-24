import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { deps } from '../../src/deps.js';
import { startDb, stopDb } from '../db.js';

describe('POST /api/voice/transcribe', () => {
  let app;
  let originalGroq;

  beforeAll(async () => {
    await startDb();
    originalGroq = deps.groq;
    app = createApp();
  });

  afterAll(async () => {
    deps.groq = originalGroq;
    await stopDb();
  });

  it('rejects with 400 if file is missing in multipart form', async () => {
    const res = await request(app)
      .post('/api/voice/transcribe')
      .field('dummy', '1')
      .expect(400);

    expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('rejects with 415 if Content-Type is not multipart or json', async () => {
    const res = await request(app)
      .post('/api/voice/transcribe')
      .set('Content-Type', 'text/plain')
      .send('hello')
      .expect(415);

    expect(res.body.error).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('rejects with 400 if file type is unsupported', async () => {
    const res = await request(app)
      .post('/api/voice/transcribe')
      .attach('file', Buffer.from('fake image'), { filename: 'test.png', contentType: 'image/png' })
      .expect(400);

    expect(res.body.error).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });

  it('rejects with 413 if audio file exceeds 6 MB limit', async () => {
    const huge = Buffer.alloc(6 * 1024 * 1024 + 1);
    const res = await request(app)
      .post('/api/voice/transcribe')
      .attach('file', huge, { filename: 'huge.webm', contentType: 'audio/webm' })
      .expect(413);

    expect(res.body.error).toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('returns 503 if groq is not configured', async () => {
    deps.groq = {
      ...originalGroq,
      transcribe: vi.fn().mockRejectedValue({ code: 'not_configured' }),
    };

    const res = await request(app)
      .post('/api/voice/transcribe')
      .attach('file', Buffer.from('fake-audio-bytes'), { filename: 'audio.webm', contentType: 'audio/webm' })
      .expect(503);

    expect(res.body.error).toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('successfully transcribes audio and returns 200 with text', async () => {
    const mockTranscribe = vi.fn().mockResolvedValue({ text: 'मेरा एटीएम कार्ड ब्लॉक हो गया है' });
    deps.groq = {
      ...originalGroq,
      transcribe: mockTranscribe,
    };

    const res = await request(app)
      .post('/api/voice/transcribe')
      .field('language', 'hi')
      .attach('file', Buffer.from('fake-audio-bytes'), { filename: 'mic.webm', contentType: 'audio/webm' })
      .expect(200);

    expect(res.body).toEqual({ text: 'मेरा एटीएम कार्ड ब्लॉक हो गया है' });
    expect(mockTranscribe).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/webm',
      expect.objectContaining({ language: 'hi' })
    );
  });
});
