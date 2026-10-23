import { expect, test } from '@playwright/test';
import { agentApi, raiseTicket, rate5, register, statusPill } from './helpers';

test('handoff: draft → agent replies in Chatwoot → live in portal → agent resolves → CSAT', async ({ page }) => {
  await register(page);
  const number = await raiseTicket(page, 'Refund not received',
    'I cancelled my plan last week and was promised a refund but it has not reached my bank account yet.');

  await expect(statusPill(page, 'In progress')).toBeVisible();
  await expect(page.getByText("We've passed this to our support team.", { exact: false })).toBeVisible();

  const api = await agentApi();
  const c = await api.conversation(number);
  expect(c.status).toBe('open');
  expect(c.custom_attributes).toMatchObject({ ticket_number: number, ai_tier: 'draft' });
  expect(c.labels).toEqual(expect.arrayContaining(['billing', 'ai-draft']));
  expect(c.priority).toBe('medium');

  const reply = `Hi, your refund was approved today — ref ${Date.now()}.`;
  const t0 = Date.now();
  await api.reply(c.id, reply);
  await expect(page.getByText(reply)).toBeVisible({ timeout: 5_000 });   // live via SSE, no reload
  expect(Date.now() - t0).toBeLessThanOrEqual(5_000);

  await api.resolve(c.id);
  await expect(statusPill(page, 'Resolved')).toBeVisible();
  await rate5(page);
});
