import { expect, type Page } from '@playwright/test';

const e = process.env;
const cw = `http://localhost:${e.CW_PORT ?? '3000'}`;

export async function register(page: Page, name = 'E2E Customer') {
  const email = `e2e+${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-9');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).not.toHaveURL(/\/register/);
  return email;
}

export async function raiseTicket(page: Page, subject: string, description: string) {
  await page.goto('/tickets/new');
  await page.getByLabel('Subject').fill(subject);
  await page.getByLabel("What's happening?").fill(description);
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await expect(page).toHaveURL(/\/tickets\/SC-\d+$/);
  return page.url().split('/').pop()!;
}

export const statusPill = (page: Page, label: string) => page.locator('header, main').getByText(label, { exact: true }).first();

export async function rate5(page: Page) {
  await page.getByLabel('5 — Excellent').check();
  await page.getByRole('button', { name: 'Send rating' }).click();
  await expect(page.getByText('Thanks — you rated 5/5.')).toBeVisible();
}

/** Chatwoot Application API as the seeded agent (token from sign-in; never logged). */
export async function agentApi() {
  const r = await fetch(`${cw}/auth/sign_in`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e.CW_AGENT_EMAIL, password: e.CW_AGENT_PASSWORD }) });
  expect(r.ok, 'agent sign-in').toBeTruthy();
  const me = (await r.json()).data;
  const token = me.access_token as string;
  const base = `${cw}/api/v1/accounts/${e.CHATWOOT_ACCOUNT_ID}`;
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${base}${path}`, { ...init, headers: { api_access_token: token, 'Content-Type': 'application/json' } });
    expect(res.ok, `${init.method ?? 'GET'} ${path} → ${res.status}`).toBeTruthy();
    return res.json();
  };
  return {
    name: (me.available_name || me.name) as string,
    async conversation(ticket: string) {
      const j = await call(`/conversations?status=all&inbox_id=${e.CHATWOOT_INBOX_ID}`);
      return j.data.payload.find((c: any) => c.custom_attributes?.ticket_number === ticket);
    },
    reply: (id: number, content: string) => call(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
    messages: async (id: number) => (await call(`/conversations/${id}/messages`)).payload as any[],
    /** Agent reply with a file (multipart, like the Chatwoot dashboard). */
    async replyWithFile(id: number, content: string, file: { name: string; mime: string; body: Buffer }) {
      const fd = new FormData();
      fd.append('content', content);
      fd.append('message_type', 'outgoing');
      fd.append('attachments[]', new Blob([file.body], { type: file.mime }), file.name);
      const res = await fetch(`${base}/conversations/${id}/messages`, { method: 'POST', headers: { api_access_token: token }, body: fd });
      expect(res.ok, `attachment reply → ${res.status}`).toBeTruthy();
      return res.json();
    },
    /** Same call the agent dashboard makes while typing (is_private = typing a private note). */
    typing: (id: number, on: boolean, isPrivate = false) => fetch(`${base}/conversations/${id}/toggle_typing_status`, { method: 'POST',
      headers: { api_access_token: token, 'Content-Type': 'application/json' }, body: JSON.stringify({ typing_status: on ? 'on' : 'off', is_private: isPrivate }) })
      .then((res) => expect(res.ok, `toggle_typing_status → ${res.status}`).toBeTruthy()),
    contact: async (id: number) => (await call(`/contacts/${id}`)).payload,
    resolve: (id: number) => call(`/conversations/${id}/toggle_status`, { method: 'POST', body: JSON.stringify({ status: 'resolved' }) }),
  };
}

/** 1×1 PNG (real magic bytes, so the api's upload sniffing accepts it). */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Mailhog (dev) messages addressed to `to`. */
export async function mailsTo(to: string) {
  const r = await fetch(`http://localhost:${e.MAILHOG_PORT ?? '8025'}/api/v2/search?kind=to&query=${encodeURIComponent(to)}`);
  return ((await r.json()).items ?? []) as { Content: { Headers: Record<string, string[]>; Body: string }; Raw: { Data: string } }[];
}

/** The fixed "Ask AI" launcher must not cover page content once the page is scrolled to the end. */
export async function launcherCovers(page: Page) {
  return page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const btn = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find((x) => getComputedStyle(x.parentElement!).position === 'fixed');
    const main = document.getElementById('main');
    if (!btn || !main) return [];
    const l = btn.getBoundingClientRect();
    if (!l.width) return [];
    return [...main.querySelectorAll('a,button,input,select,textarea,h1,h2,h3,p,li,img,label')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' &&
        r.left < l.right && r.right > l.left && r.top < l.bottom && r.bottom > l.top;
    }).map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`);
  });
}

/**
 * Registration is limited to 5/h per IP and the other specs already use all 5. This spec registers straight against the api
 * (127.0.0.1:4000, trusted one proxy hop) with its own X-Forwarded-For, then signs in through the UI like any user.
 */
export async function registerViaApi(name = 'E2E Gaps') {
  const email = `e2e+${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;
  const password = 'correct-horse-9';
  const r = await fetch(`http://127.0.0.1:${e.API_PORT ?? '4000'}/api/auth/register`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `198.18.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` },
    body: JSON.stringify({ name, email, password }) });
  expect(r.status, 'register via api').toBe(201);
  return { email, password };
}

export async function login(page: Page, u: { email: string; password: string }, remember = false) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password', { exact: true }).fill(u.password);
  if (remember) await page.getByRole('checkbox', { name: 'Remember me' }).check();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
