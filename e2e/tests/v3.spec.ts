import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { mailsTo } from './helpers';

// v3: email sign-in codes (mailhog) and the WhatsApp channel against the Graph API mock in e2e/groq-stub.mjs
// (`make e2e` points Chatwoot sidekiq's WHATSAPP_CLOUD_BASE_URL at it).
const e = process.env;
const root = fileURLToPath(new URL('../..', import.meta.url));
const cw = `http://localhost:${e.CW_PORT ?? '3000'}`;
const WA_NUMBER = '+15550001234', WA_PHONE_NUMBER_ID = '1555000111';   // the mock's phone_number_id
const dc = (args: string[], input?: string) => execFileSync('docker', ['compose', ...args], { cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

async function codeFor(email: string, nth: number) {
  let subject = '';
  await expect.poll(async () => {
    const m = await mailsTo(email);
    subject = m.length >= nth ? m[0].Content.Headers.Subject[0] : '';   // newest first
    return subject;
  }, { timeout: 30_000 }).toMatch(/^\d{6} is your SmartCC sign-in code$/);
  return subject.slice(0, 6);
}

async function enterCode(page: Page, email: string, nth: number, button: string) {
  await expect(page.getByText(`We sent a 6-digit code to ${email}.`, { exact: false })).toBeVisible();
  await expect(page.getByLabel('Code')).toHaveAttribute('autocomplete', 'one-time-code');
  await page.getByLabel('Code').fill(await codeFor(email, nth));
  await page.getByRole('button', { name: button, exact: true }).click();
}

test('sign-up and sign-in with an email code; WhatsApp message → portal ticket with AI reply over WhatsApp', async ({ page, context }) => {
  test.setTimeout(300_000);
  const email = `e2e+otp${Date.now()}@example.com`;
  const phone = `+9199${String(Date.now()).slice(-8)}`;

  // 1. register by code (mailhog)
  const started = Date.now();
  await page.goto('/register');
  await page.getByRole('button', { name: 'Sign up with an email code instead' }).click();
  await page.getByLabel('Your name').fill('OTP Customer');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await enterCode(page, email, 1, 'Create account');
  await expect(page).not.toHaveURL(/\/register/);
  const mail = (await mailsTo(email))[0];
  expect(mail.Content.Body).toContain('expires in 10 minutes');

  // 2. link a phone number to the account
  const patch = await page.request.patch('/api/me', { data: { phone } });
  expect(patch.ok(), 'PATCH /api/me phone').toBeTruthy();

  // 3. WhatsApp Cloud inbox (fake credentials, accepted by the mock) with the SmartCC bot + agents; created inside sidekiq so the
  //    credential check uses the mock base URL
  const out = dc(['exec', '-T', '-e', `ACC=${e.CHATWOOT_ACCOUNT_ID}`, 'sidekiq', 'bundle', 'exec', 'rails', 'runner', '-'], `
    account = Account.find(ENV.fetch('ACC').to_i)
    ch = Channel::Whatsapp.find_by(phone_number: '${WA_NUMBER}') || Channel::Whatsapp.create!(account: account, phone_number: '${WA_NUMBER}',
      provider: 'whatsapp_cloud', provider_config: { 'api_key' => 'e2e-token', 'phone_number_id' => '${WA_PHONE_NUMBER_ID}', 'business_account_id' => 'e2e-waba' })
    inbox = Inbox.find_by(channel: ch) || Inbox.create!(account: account, channel: ch, name: 'WhatsApp (e2e)')
    bot = AgentBot.find_by!(name: 'SmartCC AI')
    AgentBotInbox.find_or_create_by!(inbox: inbox, agent_bot: bot, account: account)
    account.users.each { |u| InboxMember.find_or_create_by!(inbox: inbox, user: u) }
    puts({ inbox_id: inbox.id }.to_json)`);
  expect(out).toMatch(/"inbox_id":\d+/);

  // 4. inbound message exactly as Meta posts it
  const wamid = `wamid.e2e.${Date.now()}`;
  const hook = await fetch(`${cw}/webhooks/whatsapp/${encodeURIComponent(WA_NUMBER)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'e2e-waba', changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp', metadata: { display_phone_number: WA_NUMBER.slice(1), phone_number_id: WA_PHONE_NUMBER_ID },
      contacts: [{ profile: { name: 'OTP Customer' }, wa_id: phone.slice(1) }],
      messages: [{ from: phone.slice(1), id: wamid, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text',
        text: { body: 'Payment deducted but my plan is still inactive' } }] } }] }] }) });
  expect(hook.status, 'Chatwoot WhatsApp webhook').toBe(200);

  // 5. the AI answer goes out over WhatsApp: plain text, ≤ 4096 chars, to the customer's number
  let reply: any;
  await expect.poll(() => {
    const sent = JSON.parse(dc(['exec', '-T', 'groq-stub', 'node', '-e', "fetch('http://127.0.0.1:8080/wa/sent').then(r=>r.text()).then(console.log)"]));
    reply = sent.find((s: any) => s.to === phone.slice(1));
    return !!reply;
  }, { timeout: 120_000, intervals: [2000] }).toBe(true);
  expect(reply).toMatchObject({ phoneNumberId: WA_PHONE_NUMBER_ID, auth: 'bearer', type: 'text' });
  expect(reply.text.body).toContain('Wait 30 minutes for the bank confirmation.');
  expect(reply.text.body).toContain('Sources: Payment Pending / Subscription Not Active');
  expect(reply.text.body.length).toBeLessThanOrEqual(4096);
  expect(reply.text.body).not.toMatch(/\*\*|\]\(/);

  // 6. the linked customer sees the ticket with a WhatsApp badge; replies happen on WhatsApp
  await page.goto('/tickets');
  const row = page.locator('table').getByRole('link', { name: /Payment deducted but my plan is still inactive/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('WhatsApp', { exact: true })).toBeVisible();
  await row.click();
  await expect(page.getByText('This conversation is on WhatsApp.', { exact: false })).toBeVisible();
  await expect(page.getByText('AI assistant said:', { exact: false })).toBeAttached();

  // 7. sign in again with a code (after the 30 s resend window for this email)
  await context.clearCookies();
  await page.waitForTimeout(Math.max(0, 31_000 - (Date.now() - started)));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Email me a code instead' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await enterCode(page, email, 2, 'Sign in');
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/tickets');
  await expect(page.locator('table').getByRole('link', { name: /Payment deducted but my plan is still inactive/ })).toBeVisible();
});
