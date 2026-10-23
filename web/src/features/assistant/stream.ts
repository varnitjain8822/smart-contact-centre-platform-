import { ApiError } from '../../lib/api';
import i18n from '../../i18n';
import type { ApiErrorBody, Locale, Source } from '../../lib/types';

export type SseEvent = { event: string; data: string };

/** Incremental text/event-stream parser: feed decoded chunks, get each complete event (comments and `retry:` ignored). */
export function sseParser(on: (e: SseEvent) => void) {
  let buf = '';
  return (chunk: string) => {
    buf = (buf + chunk).replace(/\r\n?/g, '\n');
    for (let i = buf.indexOf('\n\n'); i >= 0; i = buf.indexOf('\n\n')) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (!line || line.startsWith(':')) continue;
        const c = line.indexOf(':');
        const k = c < 0 ? line : line.slice(0, c);
        const v = c < 0 ? '' : line.slice(c + 1).replace(/^ /, '');
        if (k === 'event') event = v;
        else if (k === 'data') data.push(v);
      }
      if (data.length) on({ event, data: data.join('\n') });
    }
  };
}

export type ChatMsg = { role: 'user' | 'assistant'; content: string };
export type StreamHandlers = {
  onToken(t: string): void; onSources(s: Source[]): void; onDone(d: { suggestTicket: boolean }): void; onError(code: string, message: string): void;
};

/**
 * POST /api/assistant/chat and read the SSE reply with a stream reader (EventSource cannot POST).
 * Throws ApiError before streaming (503 AI_UNAVAILABLE, 429 RATE_LIMITED, …). A stream that ends without `done`
 * is reported through onError + onDone({suggestTicket:true}), like the server's own mid-stream failure.
 */
export async function chatStream(messages: ChatMsg[], locale: Locale, h: StreamHandlers, signal?: AbortSignal) {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ messages, locale }),
  });
  if (!res.ok || !res.body) {
    const e = ((await res.json().catch(() => null)) as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.message ?? i18n.t('error.title'), undefined,
      Number(res.headers.get('Retry-After')) || undefined);
  }
  let done = false;
  const feed = sseParser(({ event, data }) => {
    let d: Record<string, unknown>;
    try { d = JSON.parse(data); } catch { return; }
    if (event === 'token' && typeof d.t === 'string') h.onToken(d.t);
    else if (event === 'sources') h.onSources(Array.isArray(d.sources) ? (d.sources as Source[]) : []);
    else if (event === 'error') h.onError(String(d.code ?? 'AI_UNAVAILABLE'), String(d.message ?? ''));
    else if (event === 'done') { done = true; h.onDone({ suggestTicket: !!d.suggestTicket }); }
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    feed(dec.decode(value, { stream: true }));
  }
  feed(dec.decode() + '\n\n');
  if (!done) { h.onError('AI_UNAVAILABLE', ''); h.onDone({ suggestTicket: true }); }
}
