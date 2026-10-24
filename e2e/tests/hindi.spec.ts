import { expect, test, type Page } from '@playwright/test';
import { register } from './helpers';

async function raiseHi(page: Page, subject: string, description: string) {
  await page.goto('/c/smartcc/tickets/new');
  await page.getByLabel('विषय').fill(subject);
  await page.getByLabel('क्या हो रहा है?').fill(description);
  await page.getByRole('button', { name: 'टिकट भेजें' }).click();
  await expect(page).toHaveURL(/\/tickets\/SC-\d+$/);
}

test('Hindi: switch language → UI, KB, AI answer, hand-off text and assistant all in Hindi', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await register(page, 'Asha Verma');
  await page.getByRole('button', { name: /Language: English/ }).click();
  await page.getByRole('menuitemradio', { name: 'हिन्दी' }).or(page.getByRole('menuitem', { name: 'हिन्दी' })).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/सुप्रभात|नमस्ते|शुभ/);
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.user.locale).toBe('hi');                                         // saved to the account, not just the browser

  // KB in Hindi
  await page.goto('/c/smartcc/help/refund-status');
  await expect(page.getByRole('heading', { level: 1, name: /रिफ़ंड/ })).toBeVisible();

  // auto-tier AI answer in Hindi
  await raiseHi(page, 'पेमेंट कट गया पर प्लान चालू नहीं', 'मैंने कल Pro प्लान का पेमेंट (payment) किया, पैसे कट गए पर प्लान अभी तक चालू नहीं हुआ।');
  await expect(page.getByText('AI सहायक ने कहा:', { exact: false }).first()).toBeAttached();
  await expect(page.getByText('बैंक की पुष्टि के लिए 30 मिनट रुकें।', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'इससे हल हो गया' })).toBeVisible();

  // draft tier → hand-off system message stored in the ticket's locale
  await raiseHi(page, 'रिफ़ंड नहीं मिला', 'पिछले हफ़्ते प्लान रद्द किया, रिफ़ंड (refund) का वादा हुआ था पर अभी तक बैंक में नहीं आया।');
  await expect(page.getByText('हमने आपका मामला हमारी सपोर्ट टीम को भेज दिया है।', { exact: false })).toBeVisible();

  // assistant streams in Hindi
  await page.goto('/c/smartcc/assistant');
  const input = page.getByLabel('आपका सवाल');
  await input.fill('मेरा पेमेंट कट गया लेकिन प्लान चालू नहीं हुआ');
  await input.press('Enter');
  await expect(page.getByRole('region', { name: 'AI सहायक से बातचीत' }).getByText('बैंक की पुष्टि के लिए 30 मिनट रुकें।', { exact: false })).toBeVisible();
});
