import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import i18n from '../src/i18n';
import { api } from '../src/lib/api';
import { brandCss, contrast, ensureContrast, hexToRgb } from '../src/lib/brand';
import { basenameFor, categoryKeys, categoryLabel, company, resetCompany, setCompany, slugFromPath, type Company } from '../src/lib/company';
import { AiMessage } from '../src/features/tickets/AiMessage';
import { AppShell } from '../src/features/shell/AppShell';
import { DemoRibbon } from '../src/features/shell/DemoRibbon';
import { future } from '../src/routes';
import CompanyPickerPage from '../src/pages/CompanyPickerPage';
import { msg, newQc, routeFetch, wrap } from './helpers';

const acme: Company = { slug: 'acme', name: 'Acme Retail', sector: 'Retail', tagline: 'Orders and returns', primaryColor: '#E8B400', accentColor: '#0F766E',
  logoText: 'Acme', supportHours: '', demo: true, categories: [{ key: 'orders', label: 'Orders', labelHi: 'ऑर्डर' }, { key: 'returns', label: 'Returns', labelHi: 'वापसी' }] };

afterEach(async () => { resetCompany(); await i18n.changeLanguage('en'); });

describe('v4 routing', () => {
  it('slugFromPath / basename', () => {
    expect(slugFromPath('/c/sbi')).toBe('sbi');
    expect(slugFromPath('/c/delhiairport/tickets/SC-1')).toBe('delhiairport');
    expect(slugFromPath('/tickets')).toBeNull();
    expect(slugFromPath('/c/')).toBeNull();
    expect(slugFromPath('/cx/sbi')).toBeNull();
    expect(basenameFor('sbi')).toBe('/c/sbi');
  });

  it('in-app links stay inside the company basename', async () => {
    routeFetch({ 'GET /api/auth/me': { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'x' } } }, 'GET /api/kb/articles': { body: { items: [] } } });
    const router = createMemoryRouter([{ element: <AppShell />, children: [{ path: '/help', element: <p>help</p> }] }],
      { initialEntries: ['/c/acme/help'], basename: '/c/acme', future });
    setCompany(acme);
    render(<QueryClientProvider client={newQc()}><RouterProvider router={router} future={{ v7_startTransition: true }} /></QueryClientProvider>);
    expect((await screen.findAllByRole('link', { name: 'Sign in' }))[0]!.getAttribute('href')).toBe('/c/acme/login');
    expect(screen.getAllByText('Acme').length).toBeGreaterThan(0);   // logo text
  });
});

describe('v4 company context', () => {
  it('requests name the company only once one is set', async () => {
    const calls = routeFetch({ 'GET /api/kb/articles': { body: { items: [] } } });
    await api.kbList();
    expect(new Headers(calls[0]!.init.headers).get('X-Company')).toBeNull();
    setCompany(acme);
    await api.kbList();
    expect(new Headers(calls[1]!.init.headers).get('X-Company')).toBe('acme');
  });

  it('topics + labels come from the company (Hindi too); brand interpolation', async () => {
    expect(categoryKeys()).toContain('Billing');
    expect(categoryLabel('Billing')).toBe('Billing');
    setCompany(acme);
    expect(categoryKeys()).toEqual(['orders', 'returns']);
    expect(categoryLabel('returns')).toBe('Returns');
    expect(i18n.t('shell.home')).toBe('Acme home');
    await i18n.changeLanguage('hi');
    expect(categoryLabel('returns')).toBe('वापसी');
    expect(categoryLabel('unknown')).toBe('unknown');
    expect(company().slug).toBe('acme');
  });
});

describe('v4 branding (WCAG AA)', () => {
  const WHITE = hexToRgb('#ffffff'), LIGHT_BG = hexToRgb('#F6F4EE'), DARK = hexToRgb('#151821');
  const tokens = (css: string, theme: string) => {
    const block = css.split(theme)[1]!.split('}')[0]!;
    return Object.fromEntries([...block.matchAll(/--([\w-]+):(\d+) (\d+) (\d+)/g)].map((m) => [m[1], [Number(m[2]), Number(m[3]), Number(m[4])] as [number, number, number]]));
  };
  it.each(['#E8B400', '#FFFF00', '#007CC3', '#22409A', '#0F766E', '#ffffff', '#000000', '#E4002B'])('%s → AA in light and dark', (hex) => {
    const css = brandCss(hex, hex);
    const light = tokens(css, ":root,[data-theme='light']{"), dark = tokens(css, "[data-theme='dark']{");
    expect(contrast(light.accent!, WHITE)).toBeGreaterThanOrEqual(4.5);      // white text on accent buttons
    expect(contrast(light.accent!, LIGHT_BG)).toBeGreaterThanOrEqual(4.5);   // accent text on the page
    expect(contrast(dark.accent!, DARK)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['brand-ribbon']!, light['brand-ribbon-ink']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps an already-AA colour unchanged', () => {
    expect(ensureContrast(hexToRgb('#22409A'), [WHITE], [0, 0, 0])).toEqual(hexToRgb('#22409A'));
  });
});

describe('v4 picker + records chip', () => {
  it('picker: one card per company linking to /c/<slug>, demo badge', async () => {
    routeFetch({ 'GET /api/companies': { body: { items: [{ ...acme, slug: 'smartcc', name: 'SmartCC', demo: false }, acme] } } });
    render(<CompanyPickerPage />, { wrapper: wrap() });
    const card = await screen.findByRole('link', { name: /^Acme Retail/ });
    expect(card.getAttribute('href')).toBe('/c/acme');
    expect(within(card).getByText('Demo data')).toBeTruthy();
    expect(within(screen.getByRole('link', { name: /^SmartCC/ })).queryByText('Demo data')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Choose a help desk' })).toBeTruthy();
  });
  it('demo ribbon (every page of a demo portal, also signed out) links back to the picker', () => {
    render(<DemoRibbon />, { wrapper: wrap() });
    expect(screen.getByRole('note').textContent).toContain('Demo data');
    expect(within(screen.getByRole('note')).getByRole('link', { name: 'All help desks' }).getAttribute('href')).toBe('/');
  });
  it('AI message shows "Checked your records" only when the answer used records', () => {
    const { rerender } = render(<AiMessage m={msg({ author: 'ai', usedRecords: true })} />, { wrapper: wrap() });
    expect(screen.getByText('Checked your records')).toBeTruthy();
    rerender(<AiMessage m={msg({ author: 'ai' })} />);
    expect(screen.queryByText('Checked your records')).toBeNull();
  });
});
