import { expect, test } from '@playwright/test';
import { agentApi, raiseTicket, rate5, register, statusPill } from './helpers';

test('demo: AI answers from KB → This solved it → Resolved → CSAT 5', async ({ page }) => {
  await register(page);
  const number = await raiseTicket(page, 'Payment deducted but plan inactive',
    'I paid for the Pro plan yesterday. The payment was deducted from my account but the plan is still inactive.');

  await expect(page.getByText('AI assistant said:', { exact: false })).toBeAttached();
  await page.getByRole('button', { name: /Based on 1 article/ }).click();
  await expect(page.getByRole('link', { name: 'Payment Pending / Subscription Not Active' })).toBeVisible();

  await page.getByRole('button', { name: 'This solved it' }).click();
  await expect(statusPill(page, 'Resolved')).toBeVisible();
  await rate5(page);

  // Chatwoot side: ticket attributes, labels, priority, CSAT for the Portal ticket panel
  const api = await agentApi();
  await expect.poll(async () => (await api.conversation(number)).custom_attributes.csat).toBe(5);
  const c = await api.conversation(number);
  expect(c.custom_attributes).toMatchObject({ ticket_number: number, ai_tier: 'auto', ai_confidence: 0.95 });
  expect(c.custom_attributes.sla_due_at).toBeTruthy();
  expect(c.labels).toEqual(expect.arrayContaining(['billing', 'ai-auto']));
  expect(c.priority).toBe('high');
  expect(c.status).toBe('resolved');
});
