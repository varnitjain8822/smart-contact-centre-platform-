import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { launcherCovers, raiseTicket, register } from './helpers';

const SIZES = [[1440, 900], [1280, 900], [768, 1024], [360, 780]] as const;
const SCHEMES = ['light', 'dark'] as const;

async function check(page: Page, path: string) {
  for (const colorScheme of SCHEMES) for (const [width, height] of SIZES) {
    const where = `${path} ${colorScheme}@${width}`;
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect.soft(bad.map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect.soft(sw, `${where} horizontal overflow`).toBeLessThanOrEqual(cw);
    expect.soft(await launcherCovers(page), `${where} Ask AI launcher covers content`).toEqual([]);
  }
}

test.setTimeout(900_000);   // 21 pages × 4 widths × 2 themes
test('a11y (axe: no serious/critical) + no horizontal scroll + launcher never covers content, 4 widths, light+dark, every page', async ({ page }) => {
  const P = (p: string) => `/c/smartcc${p}`;
  // v4: the company picker and two branded demo portals (company colours are adjusted to AA)
  for (const p of ['/', '/c/sbi/help', '/c/tatasteel/help', '/c/delhiairport/help', '/c/passportseva/help', '/c/infosys/help']) await check(page, p);
  for (const p of ['/login', '/register', '/help', '/help/password-reset']) await check(page, P(p));
  await page.setViewportSize({ width: 1280, height: 900 });
  await register(page);
  const number = await raiseTicket(page, 'Payment deducted but plan inactive', 'Payment was deducted but my plan is still inactive today.');
  await page.getByRole('button', { name: 'This solved it' }).waitFor();
  for (const p of ['/', '/tickets', '/tickets?status=ai_handling', '/tickets/new', `/tickets/${number}`, '/notifications', '/assistant', '/help', '/help/refund-status', '/profile', '/nope']) await check(page, P(p));
});
