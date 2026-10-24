import { setTimeout as sleep } from 'node:timers/promises';
import { cfg } from '../config.js';
import { AiError } from '../lib/errors.js';

// GROQ_API_KEY may hold several comma-separated keys: round-robin per request, next key on 429.
const keys = () => (cfg.GROQ_API_KEY ?? '').split(',').map((k) => k.trim()).filter(Boolean);
let rr = 0;
const nextKey = () => { const k = keys(); return k[rr++ % k.length]; };

/** OpenAI-compatible `message.tool_calls` → [{id, name, args}] (arguments is a JSON string; malformed → {}). */
export function parseToolCalls(message) {
  return (message?.tool_calls ?? []).filter((c) => c?.function?.name).map((c) => {
    let args = {};
    try { args = typeof c.function.arguments === 'string' ? JSON.parse(c.function.arguments || '{}') : c.function.arguments ?? {}; } catch { /* malformed */ }
    return { id: c.id, name: c.function.name, args: args && typeof args === 'object' && !Array.isArray(args) ? args : {} };
  });
}

/**
 * JSON-mode chat completion → parsed JSON object. With `tools` (OpenAI function specs) it is a function-calling round instead:
 * no JSON mode (Groq does not combine the two), tool_choice auto, and the result is {content, toolCalls:[{id,name,args}], message}.
 * Groq's 400 `tool_use_failed` (the model wrote a broken call) counts as "no tool call".
 */
export async function complete(messages, { tools } = {}) {
  if (!cfg.GROQ_API_KEY) throw new AiError('not_configured');
  const tries = Math.max(2, Math.min(keys().length, 4));
  const body = tools?.length
    ? { model: cfg.GROQ_MODEL, temperature: 0, max_tokens: 600, tools, tool_choice: 'auto', messages }
    : { model: cfg.GROQ_MODEL, temperature: 0.2, max_tokens: 800, response_format: { type: 'json_object' }, messages };
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(`${cfg.GROQ_URL}/chat/completions`, { method: 'POST', signal: AbortSignal.timeout(cfg.AI_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${nextKey()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const j = await res.json();
      const message = j.choices[0].message;
      return tools?.length ? { content: message.content ?? '', toolCalls: parseToolCalls(message), message } : JSON.parse(message.content);
    }
    if (tools?.length && res.status === 400 && /tool_use_failed/.test(await res.text().catch(() => ''))) return { content: '', toolCalls: [], message: null };
    if (attempt < tries - 1 && (res.status === 429 || res.status >= 500)) {
      if (res.status === 429 && keys().length > 1) continue;               // another key, no wait
      const wait = Math.min(5, Number(res.headers.get('retry-after')) || 2); await sleep(wait * 1000); continue;
    }
    throw new AiError(`http_${res.status}`);
  }
}

/**
 * Streaming chat completion. Resolves once Groq has answered with 200 (so callers can still send a JSON error before
 * opening their own stream); the value is an async iterable of content deltas. `signal` aborts (client went away).
 * Headers must arrive within AI_TIMEOUT_MS; the whole stream is capped at 3× that.
 */
export async function stream(messages, { signal, maxTokens = 700 } = {}) {
  if (!cfg.GROQ_API_KEY) throw new AiError('not_configured');
  const ctl = new AbortController();
  const abort = () => ctl.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const headerTimer = setTimeout(abort, cfg.AI_TIMEOUT_MS);
  const totalTimer = setTimeout(abort, cfg.AI_TIMEOUT_MS * 3);
  const done = () => { clearTimeout(headerTimer); clearTimeout(totalTimer); signal?.removeEventListener('abort', abort); };
  let res;
  const call = () => fetch(`${cfg.GROQ_URL}/chat/completions`, { method: 'POST', signal: ctl.signal,
    headers: { Authorization: `Bearer ${nextKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.GROQ_MODEL, temperature: 0.3, max_tokens: maxTokens, stream: true, messages }) });
  try {
    res = await call();
    if (res.status === 429 && keys().length > 1) res = await call();
  } catch (e) { done(); throw new AiError(ctl.signal.aborted ? 'timeout' : 'network'); }
  clearTimeout(headerTimer);
  if (!res.ok) { done(); throw new AiError(`http_${res.status}`); }
  return (async function* deltas() {
    const decoder = new TextDecoder();
    let buf = '';
    try {
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') return;
          let delta;
          try { delta = JSON.parse(data).choices?.[0]?.delta?.content; } catch { continue; }
          if (delta) yield delta;
        }
      }
    } finally { done(); }
  })();
}

export const configured = () => !!cfg.GROQ_API_KEY;

const EXT_MAP = {
  'audio/webm': 'audio.webm',
  'audio/wav': 'audio.wav',
  'audio/wave': 'audio.wav',
  'audio/x-wav': 'audio.wav',
  'audio/mp3': 'audio.mp3',
  'audio/mpeg': 'audio.mp3',
  'audio/ogg': 'audio.ogg',
  'audio/mp4': 'audio.mp4',
  'audio/m4a': 'audio.m4a',
  'audio/x-m4a': 'audio.m4a',
};

/**
 * Transcribe an audio buffer using Groq Whisper (whisper-large-v3-turbo).
 */
export async function transcribe(fileBuffer, mimeType = 'audio/webm', { language, prompt } = {}) {
  if (!cfg.GROQ_API_KEY) throw new AiError('not_configured');
  const filename = EXT_MAP[mimeType] ?? 'audio.webm';
  const fd = new FormData();
  fd.append('file', new Blob([fileBuffer], { type: mimeType }), filename);
  fd.append('model', 'whisper-large-v3-turbo');
  if (language && language !== 'auto') fd.append('language', language);
  const defaultPrompt = 'Customer support query in Hindi (हिंदी) or English (SBI, Tata Steel, Delhi Airport, Passport Seva, Infosys, SmartCC, खाते, बिल, चालान, शिकायत, टिकट)';
  fd.append('prompt', prompt || defaultPrompt);
  fd.append('response_format', 'json');

  const tries = Math.max(2, Math.min(keys().length, 4));
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(`${cfg.GROQ_URL}/audio/transcriptions`, {
      method: 'POST',
      signal: AbortSignal.timeout(cfg.AI_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${nextKey()}` },
      body: fd,
    });
    if (res.ok) {
      const j = await res.json();
      return { text: j.text ?? '' };
    }
    if (attempt < tries - 1 && (res.status === 429 || res.status >= 500)) {
      if (res.status === 429 && keys().length > 1) continue;
      const wait = Math.min(5, Number(res.headers.get('retry-after')) || 2);
      await sleep(wait * 1000);
      continue;
    }
    throw new AiError(`http_${res.status}`, await res.text().catch(() => ''));
  }
}
