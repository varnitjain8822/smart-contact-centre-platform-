import { expect, test } from '@playwright/test';
import { agentApi } from './helpers';

// v4 multi-company. `make e2e` loads the acme fixture company (api/test/fixtures/companies/acme) and removes it afterwards.

test('picker at / lists every portal; a card opens /c/<slug> with its branding and the Demo data ribbon; old URLs redirect', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Choose a help desk' })).toBeVisible();
  for (const name of ['SmartCC', 'State Bank of India', 'Acme Retail']) await expect(page.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible();
  await page.getByRole('link', { name: /^State Bank of India/ }).click();
  await expect(page).toHaveURL(/\/c\/sbi$/);
  await expect(page.getByRole('note')).toContainText('Demo data');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).not.toBe('61 53 200');
  await page.goto('/help');
  await expect(page).toHaveURL(/\/c\/smartcc\/help$/);
  await expect(page.getByRole('note')).toHaveCount(0);   // SmartCC is not a demo portal
});

test('acme portal: own topics and KB, demo customer signs in, assistant checks her records, ticket lands in Chatwoot with the company', async ({ page }) => {
  await page.goto('/c/acme/help');
  await expect(page.getByRole('link', { name: /Returns & refunds/ })).toBeVisible();
  await expect(page.getByText('Password Reset Guide')).toHaveCount(0);   // SmartCC's KB is not here

  await page.goto('/c/acme/login');
  await page.getByLabel('Email').fill('asha@acme.test');
  await page.getByLabel('Password', { exact: true }).fill('Demo@1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/c\/acme\/?$/);

  await page.goto('/c/acme/assistant');
  const input = page.getByLabel('Your question');
  await input.fill('What is the status of my order AC-1001?');
  await input.press('Enter');
  const log = page.getByRole('region', { name: 'Conversation with the AI assistant' });
  await expect(log.getByText('Your record shows the status: Shipped.')).toBeVisible();
  await expect(log.getByText('Checked your records')).toBeVisible();

  // the same session is signed out on another company's portal
  await page.goto('/c/smartcc/tickets');
  await expect(page).toHaveURL(/\/c\/smartcc\/login/);

  await page.goto('/c/acme/tickets/new');
  await page.getByLabel('Subject').fill('Order not delivered');
  await page.getByLabel("What's happening?").fill('My order AC-1002 says delivered but I have not received it.');
  await page.getByRole('radio', { name: 'Orders' }).check();
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await expect(page).toHaveURL(/\/c\/acme\/tickets\/SC-\d+$/);
  const ticket = page.url().split('/').pop()!;
  const agent = await agentApi();
  await expect.poll(async () => (await agent.conversation(ticket))?.custom_attributes?.company, { timeout: 30_000 }).toBe('Acme Retail');
});

test('voice agent: mic button, hands-free toggle, read aloud, and voice transcription endpoint', async ({ page, request }) => {
  // 1. Voice endpoint integration via groq-stub
  const fakeAudio = Buffer.from('RIFF....WAVEfmt ....data....');
  const transcribeRes = await request.post('/api/voice/transcribe', {
    multipart: {
      file: {
        name: 'test.webm',
        mimeType: 'audio/webm',
        buffer: fakeAudio,
      },
      language: 'en',
    },
  });
  expect(transcribeRes.ok()).toBeTruthy();
  const json = await transcribeRes.json();
  expect(json.text).toBe('I lost my debit card');

  // 2. Hindi transcription
  const hiRes = await request.post('/api/voice/transcribe', {
    multipart: {
      file: {
        name: 'test.webm',
        mimeType: 'audio/webm',
        buffer: fakeAudio,
      },
      language: 'hi',
    },
  });
  expect(hiRes.ok()).toBeTruthy();
  const hiJson = await hiRes.json();
  expect(hiJson.text).toBe('मेरा एटीएम कार्ड खो गया है');

  // 3. UI checks in AssistantChat
  await page.goto('/c/acme/login');
  await page.getByLabel('Email').fill('asha@acme.test');
  await page.getByLabel('Password', { exact: true }).fill('Demo@1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/c\/acme\/?$/);

  await page.goto('/c/acme/assistant');
  await expect(page.getByRole('button', { name: 'Hands-free' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voice input' })).toBeVisible();

  // Send a question to see answer bubble with speaker button
  const input = page.getByLabel('Your question');
  await input.fill('What is the status of my order AC-1001?');
  await input.press('Enter');

  const log = page.getByRole('region', { name: 'Conversation with the AI assistant' });
  await expect(log.getByText('Your record shows the status: Shipped.')).toBeVisible();
  await expect(log.getByRole('button', { name: 'Reading aloud…' })).toBeVisible();

  // 4. UI check in TicketPage Composer
  await page.goto('/c/acme/tickets/new');
  await page.getByLabel('Subject').fill('Voice test ticket');
  await page.getByLabel("What's happening?").fill('Checking voice input in ticket composer.');
  await page.getByRole('radio', { name: 'Orders' }).check();
  await page.getByRole('button', { name: 'Submit ticket' }).click();
  await expect(page).toHaveURL(/\/c\/acme\/tickets\/SC-\d+$/);
  await expect(page.getByRole('button', { name: 'Voice input' })).toBeVisible();
});

