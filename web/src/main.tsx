import { StrictMode, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './styles/index.css';
import { i18nReady } from './i18n';
import { api } from './lib/api';
import { applyBrand } from './lib/brand';
import { basenameFor, DEFAULT_COMPANY, setCompany, slugFromPath } from './lib/company';
import { makeQueryClient } from './lib/queryClient';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './ui/Toast';
import { makeRouter } from './routes';
import { Splash } from './features/auth/RequireAuth';
import CompanyPickerPage from './pages/CompanyPickerPage';
import { DemoRibbon } from './features/shell/DemoRibbon';

const render = (app: ReactNode) => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider>
        <ToastProvider>
          <Suspense fallback={<Splash />}>{app}</Suspense>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

// v4 boot: `/` = company picker; `/c/<slug>/…` = that company's portal; any other path is a pre-v4 link → the SmartCC portal.
async function boot() {
  await i18nReady;
  const { pathname, search, hash } = window.location;
  const slug = slugFromPath(pathname);
  if (!slug) {
    if (pathname === '/') return render(<CompanyPickerPage />);
    return window.location.replace(`${basenameFor(DEFAULT_COMPANY.slug)}${pathname}${search}${hash}`);
  }
  const company = await api.company(slug).then((r) => r.company, () => null);
  if (!company) return window.location.replace('/');
  setCompany(company);
  if (company.slug !== DEFAULT_COMPANY.slug) applyBrand(company.primaryColor, company.accentColor);
  document.title = company.logoText;
  render(<>{company.demo && <DemoRibbon />}<RouterProvider router={makeRouter(basenameFor(slug))} future={{ v7_startTransition: true }} /></>);
}
void boot();
