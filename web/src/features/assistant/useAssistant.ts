import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import i18n from '../../i18n';
import type { Source } from '../../lib/types';
import { chatStream, type ChatMsg } from './stream';

export type Turn = {
  id: string; role: 'user' | 'assistant'; content: string; sources?: Source[]; usedRecords?: boolean; suggestTicket?: boolean;
  interrupted?: boolean; streaming?: boolean; helpful?: 'up' | 'down';
};
export type Banner = { kind: 'unavailable' } | { kind: 'rate'; retryAfterS?: number } | null;

const key = (userId: string) => `scc-assistant:${userId}`;
const load = (userId: string): Turn[] => {
  try { return (JSON.parse(sessionStorage.getItem(key(userId)) ?? '[]') as Turn[]).map((t) => ({ ...t, streaming: false })); } catch { return []; }
};

/** Last 10 finished turns, newest kept, ≤ 4000 chars each (the server trims further). */
export const history = (turns: Turn[]): ChatMsg[] =>
  turns.filter((t) => t.content.trim() && !t.streaming).slice(-10).map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));

/** Prefill for New ticket: subject from the first question, description = the chat transcript. */
export function toTicket(turns: Turn[]) {
  const first = turns.find((t) => t.role === 'user')?.content.replace(/\s+/g, ' ').trim() ?? '';
  const subject = first.length < 5 ? i18n.t('assistant.subjectFallback') : first.length > 120 ? `${first.slice(0, 119)}…` : first;
  const lines = turns.filter((t) => t.content.trim())
    .map((t) => `${t.role === 'user' ? i18n.t('actor.customer') : i18n.t('ai.badge')}: ${t.content.trim()}`);
  const description = `${i18n.t('assistant.transcriptHead')}\n\n${lines.join('\n\n')}`.slice(0, 5000);
  return { subject, description };
}

/** Chat state for the assistant page and launcher panel; kept in sessionStorage only (chats are never stored server-side; 👍/👎 are). */
export function useAssistant(userId: string) {
  const [turns, setTurns] = useState<Turn[]>(() => load(userId));
  const [banner, setBanner] = useState<Banner>(null);
  const ctl = useRef<AbortController | null>(null);
  const streaming = turns.some((t) => t.streaming);

  useEffect(() => {
    try { sessionStorage.setItem(key(userId), JSON.stringify(turns.filter((t) => !t.streaming))); } catch { /* storage off */ }
  }, [turns, userId]);
  useEffect(() => () => ctl.current?.abort(), []);

  const patchLast = (f: (t: Turn) => Turn) => setTurns((l) => l.map((t, i) => (i === l.length - 1 && t.role === 'assistant' ? f(t) : t)));

  const send = async (text: string) => {
    const content = text.trim().slice(0, 4000);
    if (!content || streaming) return;
    const user: Turn = { id: crypto.randomUUID(), role: 'user', content };
    const msgs = history([...turns, user]);
    setBanner(null);
    setTurns((l) => [...l, user, { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }]);
    const c = new AbortController();
    ctl.current = c;
    try {
      await chatStream(msgs, i18n.language === 'hi' ? 'hi' : 'en', {
        onToken: (t) => patchLast((x) => ({ ...x, content: x.content + t })),
        onSources: (sources, usedRecords) => patchLast((x) => ({ ...x, sources, usedRecords })),
        onError: () => patchLast((x) => ({ ...x, interrupted: true })),
        onDone: ({ suggestTicket }) => patchLast((x) => ({ ...x, suggestTicket, streaming: false })),
      }, c.signal);
    } catch (e) {
      if (c.signal.aborted) { patchLast((x) => ({ ...x, streaming: false, interrupted: !x.content })); return; }
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'AI_UNAVAILABLE' || code === 'RATE_LIMITED') {
        setTurns((l) => l.filter((t) => !t.streaming));
        setBanner(code === 'RATE_LIMITED' ? { kind: 'rate', retryAfterS: (e as ApiError).retryAfterS } : { kind: 'unavailable' });
      } else patchLast((x) => ({ ...x, streaming: false, interrupted: true, suggestTicket: true }));
    } finally {
      patchLast((x) => (x.streaming ? { ...x, streaming: false } : x));
    }
  };

  return {
    turns, banner, streaming, send,
    stop: () => ctl.current?.abort(),
    clear: () => { ctl.current?.abort(); setTurns([]); setBanner(null); },
    /** Toggle 👍/👎; stored server-side for review (best-effort: the UI never waits on it). */
    rate: (id: string, v: 'up' | 'down') => {
      const i = turns.findIndex((t) => t.id === id);
      const turn = turns[i];
      if (!turn) return;
      const next = turn.helpful === v ? undefined : v;
      setTurns((l) => l.map((t) => (t.id === id ? { ...t, helpful: next } : t)));
      const question = turns.slice(0, i).reverse().find((t) => t.role === 'user')?.content.slice(0, 4000);
      api.assistantFeedback({ answer: turn.content.slice(0, 8000), question, helpful: next ? next === 'up' : null, sources: turn.sources ?? [] }).catch(() => {});
    },
  };
}
