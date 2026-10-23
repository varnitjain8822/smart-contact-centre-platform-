import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { agentApi, launcherCovers, mailsTo, PNG, raiseTicket, register } from './helpers';

// One customer for the whole file (registration is limited to 5/h/IP): tickets raised early feed the later checks.
test.describe.configure({ mode: 'serial' });
let page: Page, email: string;
const T: Record<'pay' | 'refund' | 'other', string> = { pay: '', refund: '', other: '' };

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
  email = await register(page, 'Vee Two');
  T.pay = await raiseTicket(page, 'Payment deducted but plan inactive', 'I paid for the Pro plan yesterday. The payment was deducted but the plan is still inactive.');
  await expect(page.getByRole('button', { name: 'This solved it' })).toBeVisible();
  T.other = await raiseTicket(page, 'Cannot change my company address', 'Where do I update the company address printed on my account?');
});
test.afterAll(() => page.context().close());

test('attachments: customer screenshot → agent sees it in Chatwoot → agent file → customer downloads', async () => {
  await page.goto('/tickets/new');
  await page.getByLabel('Subject').fill('Refund not received');
  await page.getByLabel("What's happening?").fill('I cancelled my plan last week and was promised a refund but it has not reached my bank yet.');
  await page.locator('input[type=file]').setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('list', { name: 'Attached files' }).getByText('screenshot.png')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await expect(page).toHaveURL(/\/tickets\/SC-\d+$/);
  T.refund = page.url().split('/').pop()!;
  await expect(page.getByRole('button', { name: 'View screenshot.png' })).toBeVisible();

  const api = await agentApi();
  const c = await api.conversation(T.refund);
  await expect.poll(async () => (await api.messages(c.id)).flatMap((m) => m.attachments ?? []).map((a: any) => a.file_type),
    { timeout: 30_000 }).toContain('image');

  const body = `Invoice for ${T.refund}: refund approved ${Date.now()}`;
  await api.replyWithFile(c.id, 'Here is your refund receipt.', { name: 'receipt.txt', mime: 'text/plain', body: Buffer.from(body) });
  const chip = page.getByRole('link', { name: /receipt\.txt/ });
  await expect(chip).toBeVisible({ timeout: 15_000 });
  const [dl] = await Promise.all([page.waitForEvent('download'), chip.click()]);
  expect(await readFile((await dl.path())!, 'utf8')).toBe(body);
});

test('notifications: agent reply → bell (unread) + email in mailhog', async () => {
  // the attachment reply above was the first agent reply on T.refund → one in-app notification + one email
  const bell = page.getByRole('button', { name: /^Notifications, \d+ unread$/ });
  await expect(bell).toBeVisible({ timeout: 15_000 });
  await bell.click();
  const pop = page.getByRole('dialog', { name: 'Notifications' });
  await expect(pop.getByText(T.refund, { exact: false }).first()).toBeVisible();
  await pop.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await expect.poll(async () => (await mailsTo(email)).length, { timeout: 20_000 }).toBeGreaterThan(0);
  const [m] = await mailsTo(email);
  expect(m.Content.Headers.Subject.join(' ')).toContain(T.refund);
  expect(m.Content.Body).toContain(`/tickets/${T.refund}`);
  expect(m.Raw.Data).toMatch(/^List-Unsubscribe:\s+<http[^>]+\/api\/notifications\/unsubscribe\?token=/m);   // folded header: mailhog's parsed Headers drop it
});

test('dashboard: stat cards match /api/me/overview and the real tickets; launcher never covers content', async () => {
  await page.goto('/');
  const ov = await (await page.request.get('/api/me/overview')).json();
  const all = (await (await page.request.get('/api/tickets?scope=all')).json()).items as { status: string }[];
  expect(ov.counts.open).toBe(all.filter((t) => t.status !== 'resolved').length);
  expect(ov.counts.aiHandling).toBe(all.filter((t) => t.status === 'ai_handling').length);
  const stats = page.getByRole('region', { name: 'Your tickets at a glance' }).getByRole('link');
  const want = [ov.counts.open, ov.counts.aiHandling, ov.counts.waitingOnYou, ov.counts.resolved30d];
  await expect(stats).toHaveCount(4);
  for (const [i, n] of want.entries()) await expect(stats.nth(i).locator('span.font-display')).toHaveText(String(n));
  expect(ov.counts.open).toBe(3);
  for (const a of ov.popularArticles.slice(0, 3)) await expect(page.getByRole('link', { name: new RegExp(a.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first()).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Looking for a quick answer?' })).toBeVisible();
  expect(await launcherCovers(page)).toEqual([]);
});

test('/tickets: search, URL-synced filters, sort', async () => {
  await page.goto('/tickets');
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(3);

  await page.getByLabel('Search tickets').fill('refund');
  await expect(page).toHaveURL(/[?&]q=refund/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(T.refund);

  await page.getByLabel('Search tickets').fill(T.pay.toLowerCase().replace('-', ''));   // "sc1012" → exact number
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(T.pay);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(rows).toHaveCount(3);

  await page.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'AI handling' }).click();
  await expect(page).toHaveURL(/status=ai_handling/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(T.pay);
  await page.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'In progress' }).click();
  await expect(page).toHaveURL(/status=ai_handling%2Cin_progress|status=ai_handling,in_progress/);
  await expect(rows).toHaveCount(3);
  await page.reload();                                                                         // state lives in the URL
  await expect(page.getByRole('button', { name: 'In progress', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI handling', pressed: true })).toBeVisible();
  await expect(rows).toHaveCount(3);
  await page.getByRole('button', { name: 'Clear filters' }).first().click();

  await page.getByRole('button', { name: 'More filters' }).click();
  await page.getByRole('checkbox', { name: 'High' }).click();   // controlled by the URL: state lands a render later, so no .check()
  await expect(page.getByRole('checkbox', { name: 'High' })).toBeChecked();
  await expect(page).toHaveURL(/priority=high/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(T.pay);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clear filters' }).first().click();
  await expect(page.getByRole('button', { name: 'More filters', exact: true })).toBeVisible();   // badge gone = cleared state rendered

  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('created');
  await expect(page).toHaveURL(/sort=created/);
  const nums = async () => (await rows.locator('td:first-child, th:first-child').allTextContents()).map((s) => s.trim());
  await expect.poll(nums).toEqual([T.refund, T.other, T.pay]);
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('priority');
  await expect.poll(async () => (await nums())[0]).toBe(T.pay);
});

test('transcript download from the ticket menu', async () => {
  await page.goto(`/tickets/${T.refund}`);
  await page.getByRole('button', { name: 'Ticket options' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Download transcript' }).click()]);
  expect(dl.suggestedFilename()).toBe(`${T.refund}-transcript.txt`);
  const txt = await readFile((await dl.path())!, 'utf8');
  expect(txt).toContain(`SmartCC ticket ${T.refund}`);
  expect(txt).toContain('Attachment: screenshot.png (image/png');
  expect(txt).toContain('Here is your refund receipt.');
});

test('assistant: streamed answer with source → unsure answer → Convert to ticket', async () => {
  await page.goto('/assistant');
  const input = page.getByLabel('Your question');
  await input.fill('My payment was deducted but the plan is still inactive');
  await input.press('Enter');
  const log = page.getByRole('region', { name: 'Conversation with the AI assistant' });
  await expect(log.getByText('Wait 30 minutes for the bank confirmation.', { exact: false })).toBeVisible();
  await expect(log.getByRole('link', { name: 'Payment Pending / Subscription Not Active' })).toBeVisible();
  await expect(log.getByText('<<META')).toHaveCount(0);

  await input.fill('Can I get a custom GST invoice format for my shipments?');
  await input.press('Enter');
  await expect(log.getByText("I'm not sure about this one.", { exact: false })).toBeVisible();
  await log.getByRole('button', { name: 'Convert to ticket' }).last().click();

  await expect(page).toHaveURL(/\/tickets\/new$/);
  await expect(page.getByLabel('Subject')).toHaveValue(/payment was deducted/i);
  await expect(page.getByLabel("What's happening?")).toHaveValue(/custom GST invoice/);
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await expect(page).toHaveURL(/\/tickets\/SC-\d+$/);
});
