import { expect, test, type BrowserContext } from '@playwright/test';
import { agentApi, login, raiseTicket, registerViaApi } from './helpers';

// v3 gaps: remember me, KB votes, phone/organisation → Chatwoot contact, agent typing, sign out other devices.
test.describe.configure({ mode: 'serial' });

let u: { email: string; password: string };
let ticket: string;
test.beforeAll(async () => { u = await registerViaApi(); });

const session = async (ctx: BrowserContext) => (await ctx.cookies()).find((c) => c.name === 'scc_session')!;

test('remember me: unticked → session cookie; ticked → 7-day cookie', async ({ browser }) => {
  for (const remember of [false, true]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, u, remember);
    const c = await session(ctx);
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe('Lax');
    if (remember) expect(c.expires * 1000 - Date.now()).toBeGreaterThan(6.9 * 86400_000);
    else expect(c.expires).toBe(-1);
    await ctx.close();
  }
});

test('KB vote persists across reload', async ({ page }) => {
  await login(page, u);
  await page.goto('/c/smartcc/help/password-reset');
  const yes = page.getByRole('button', { name: 'Yes', exact: true });
  await expect(yes).toHaveAttribute('aria-pressed', 'false');
  await yes.click();
  await expect(yes).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Thanks — glad it helped.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/found this helpful/)).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();   // a second vote replaces the first
  await page.reload();
  await expect(page.getByRole('button', { name: 'No', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('profile phone + organisation saved and reflected on the Chatwoot contact', async ({ page }) => {
  await login(page, u);
  ticket = await raiseTicket(page, 'Cannot change my delivery address',
    'The delivery address field is greyed out on my order page and I need to change it before dispatch.');
  const phone = `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;   // unique: Chatwoot phone numbers are unique per account
  await page.goto('/c/smartcc/profile');
  await page.getByLabel(/^Phone/).fill(`${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`);
  await page.getByLabel(/^Organisation/).fill('Acme Logistics');
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(page.getByText('Details saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Phone/)).toHaveValue(phone);
  await expect(page.getByLabel(/^Organisation/)).toHaveValue('Acme Logistics');

  const api = await agentApi();
  const conv = await api.conversation(ticket);
  await expect.poll(async () => {
    const c = await api.contact(conv.meta.sender.id);
    return [c.phone_number, c.additional_attributes?.company_name];
  }).toEqual([phone, 'Acme Logistics']);
});

test('agent typing shows in the thread; private-note typing does not', async ({ page }) => {
  await login(page, u);
  await page.goto(`/c/smartcc/tickets/${ticket}`);
  await expect(page.getByRole('log')).toBeVisible();
  const api = await agentApi();
  const conv = await api.conversation(ticket);
  const indicator = page.getByText(`${api.name} is typing…`);

  await api.typing(conv.id, true, true);
  await page.waitForTimeout(3000);
  await expect(indicator).toHaveCount(0);
  await api.typing(conv.id, false, true);

  await api.typing(conv.id, true);
  await expect(indicator).toBeVisible({ timeout: 5_000 });
  await api.typing(conv.id, false);
  await expect(indicator).toHaveCount(0, { timeout: 5_000 });
});

test('sign out other devices: the second browser is signed out, this one stays', async ({ browser }) => {
  const a = await browser.newContext(), b = await browser.newContext();
  const pa = await a.newPage(), pb = await b.newPage();
  await login(pa, u, true);
  await login(pb, u);
  await pb.goto('/c/smartcc/profile');
  await expect(pb.getByRole('heading', { name: 'Profile' })).toBeVisible();

  await pa.goto('/c/smartcc/profile');
  await pa.getByRole('button', { name: 'Sign out other devices' }).click();
  const dlg = pa.getByRole('dialog', { name: 'Sign out other devices?' });
  await dlg.getByRole('button', { name: 'Sign out other devices' }).click();
  await expect(pa.getByText('Other devices signed out')).toBeVisible();
  expect((await session(a)).expires).toBeGreaterThan(0);   // re-issued, still the remembered kind

  await pb.reload();
  await expect(pb).toHaveURL(/\/login/);
  await pa.reload();
  await expect(pa.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await a.close(); await b.close();
});
