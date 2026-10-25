import i18n from '../i18n';
import { company, companyGiven, type Company } from './company';
import type { ApiErrorBody, Attachment, Category, ErrorCode, KbArticle, KbArticleSummary, KbVotes, Source, Locale, Message, NotificationPage, NotifyPrefs,
  Overview, Page, Scope, Suggestion, TicketDetail, TicketFilters, TicketSummary, User } from './types';

export class ApiError extends Error {
  constructor(public status: number, public code: ErrorCode, message: string,
    public details?: ApiErrorBody['error']['details'], public retryAfterS?: number) { super(message); }
}

/** v4: every request names the portal's company (the api scopes KB, sign-in and sessions by it). */
const companyHeader = (): Record<string, string> => (companyGiven() ? { 'X-Company': company().slug } : {});

async function req<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, { method, credentials: 'same-origin', signal,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...companyHeader(), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (json as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.message ?? i18n.t('error.title'), e?.details,
      Number(res.headers.get('Retry-After')) || undefined);
  }
  return json as T;
}

type Q = Record<string, string | number | undefined | null | string[]>;
const qs = (o: Q) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    const s = Array.isArray(v) ? v.join(',') : v;
    if (s !== undefined && s !== null && s !== '') p.set(k, String(s));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
};
const t = (n: string) => `/tickets/${encodeURIComponent(n)}`;
const lang = () => (i18n.language === 'hi' ? 'hi' : 'en');
type U = { user: User };
type T = { ticket: TicketDetail };
export type OtpTarget = { email: string } | { phone: string };
export type MePatch = { name?: string; phone?: string; organization?: string; locale?: Locale; notify?: { email?: Partial<NotifyPrefs['email']>; inApp?: boolean } };

export const api = {
  companies: () => req<{ items: Company[] }>('GET', '/companies'),
  company: (slug: string) => req<{ company: Company }>('GET', `/companies/${encodeURIComponent(slug)}`),
  register: (v: { name: string; email: string; password: string }) => req<U>('POST', '/auth/register', v),
  login: (v: { email: string; password: string; remember?: boolean }) => req<U>('POST', '/auth/login', v),
  googleLogin: (v: { email: string; name?: string; googleId?: string; avatar?: string }) => req<U>('POST', '/auth/google', v),
  logout: () => req<void>('POST', '/auth/logout', {}),
  otpOptions: () => req<{ email: boolean; sms: boolean }>('GET', '/auth/otp'),
  otpRequest: (v: OtpTarget & { locale?: Locale }) => req<{ sent: true; expiresInS: number; resendInS: number; devCode?: string }>('POST', '/auth/otp/request', v),
  otpVerify: (v: OtpTarget & { code: string; name?: string; locale?: Locale; remember?: boolean }) =>
    req<U & { created: boolean }>('POST', '/auth/otp/verify', v),
  logoutOthers: () => req<void>('POST', '/auth/logout-others', {}),
  me: () => req<U>('GET', '/auth/me'),
  updateMe: (v: MePatch) => req<U>('PATCH', '/me', v),
  changePassword: (v: { currentPassword: string; newPassword: string }) => req<void>('POST', '/me/password', v),
  overview: () => req<Overview>('GET', '/me/overview'),
  listTickets: (f: TicketFilters & { scope?: Scope }, before?: string | null, limit = 20) =>
    req<Page<TicketSummary>>('GET', `/tickets${qs({ ...f, limit, before })}`),
  createTicket: (v: { subject: string; description: string; category: Category | null; attachmentIds?: string[] }, idemKey: string) =>
    req<{ ticket: TicketDetail; messages: Message[] }>('POST', '/tickets', v, { 'Idempotency-Key': idemKey }),
  getTicket: (n: string) => req<T>('GET', t(n)),
  getMessages: (n: string) => req<{ items: Message[] }>('GET', `${t(n)}/messages`),
  sendMessage: (n: string, body: string, clientMessageId: string, attachmentIds: string[] = []) =>
    req<{ message: Message }>('POST', `${t(n)}/messages`, { body, clientMessageId, ...(attachmentIds.length && { attachmentIds }) }),
  transcriptUrl: (n: string) => `/api${t(n)}/transcript?format=txt`,
  action: (n: string, a: 'accept' | 'handoff' | 'resolve') => req<T>('POST', `${t(n)}/${a}`, {}),
  rate: (n: string, rating: number, comment: string) => req<T>('POST', `${t(n)}/csat`, { rating, comment }),
  kbList: (q?: string, category?: Category | null) => req<{ items: KbArticleSummary[] }>('GET', `/kb/articles${qs({ q, category, locale: lang() })}`),
  kbArticle: (slug: string) => req<{ article: KbArticle }>('GET', `/kb/articles/${encodeURIComponent(slug)}${qs({ locale: lang() })}`),
  kbFeedback: (slug: string, helpful: boolean) => req<{ feedback: KbVotes }>('POST', `/kb/articles/${encodeURIComponent(slug)}/feedback`, { helpful }),
  assistantFeedback: (v: { answer: string; question?: string; helpful: boolean | null; sources: Source[] }) => req<void>('POST', '/assistant/feedback', v),
  suggest: (subject: string, description: string, signal?: AbortSignal) => req<Suggestion>('POST', '/ai/suggest', { subject, description }, undefined, signal),
  notifications: (before?: string | null, unread?: boolean) => req<NotificationPage>('GET', `/notifications${qs({ before, unread: unread ? 'true' : undefined })}`),
  readNotifications: (v: { ids: string[] } | { all: true }) => req<{ unreadCount: number }>('POST', '/notifications/read', v),
  transcribeVoice: async (blob: Blob, language?: string): Promise<{ text: string }> => {
    const fd = new FormData();
    fd.append('file', blob, 'audio.webm');
    if (language) fd.append('language', language);
    const res = await fetch('/api/voice/transcribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: companyHeader(),
      body: fd,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      const e = (json as ApiErrorBody | null)?.error;
      throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.message ?? i18n.t('error.title'));
    }
    return res.json();
  },
};

/** Multipart upload with progress (fetch has no upload progress). `ticket` null = pre-ticket upload (New ticket form). */
export function upload(file: File, ticket: string | null, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', `/api${ticket ? `${t(ticket)}/attachments` : '/attachments'}`);
    x.withCredentials = true;
    for (const [k, v] of Object.entries(companyHeader())) x.setRequestHeader(k, v);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress((e.loaded / e.total) * 100); };
    x.onload = () => {
      let json: { attachment?: Attachment } & Partial<ApiErrorBody> | null = null;
      try { json = JSON.parse(x.responseText); } catch { /* non-JSON */ }
      if (x.status === 201 && json?.attachment) return resolve(json.attachment);
      reject(new ApiError(x.status, json?.error?.code ?? 'INTERNAL', json?.error?.message ?? i18n.t('error.title'), undefined,
        Number(x.getResponseHeader('Retry-After')) || undefined));
    };
    x.onerror = () => reject(new ApiError(0, 'INTERNAL', i18n.t('common.loadFailed')));
    signal?.addEventListener('abort', () => x.abort());
    const fd = new FormData();
    fd.append('file', file);
    x.send(fd);
  });
}
