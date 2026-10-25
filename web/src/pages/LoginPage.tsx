import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api';
import { safeNext } from '../lib/validate';
import { AuthForm } from '../features/auth/AuthForm';
import { OtpForm } from '../features/auth/OtpForm';
import { useLogin } from '../features/auth/hooks';
import { Logo } from '../features/shell/TopBar';
import { ThemeToggle } from '../features/shell/ThemeToggle';
import { LanguageSwitch } from '../features/shell/LanguageSwitch';
import { PageTitle } from '../ui/PageTitle';
import { Check } from 'lucide-react';

import { company } from '../lib/company';
import { getCompanyTheme } from '../features/auth/CompanyAuthThemes';

export const linkClass = 'font-semibold text-accent underline-offset-4 hover:underline';

/** Split layout: domain-specific company hero & industry widget (desktop), form on the right. */
export function AuthLayout({ title, lede, children, footer }: { title: string; lede: string; children: ReactNode; footer: ReactNode }) {
  const currentCompany = company();
  const theme = getCompanyTheme(currentCompany.slug);

  return (
    <div className="min-h-dvh xl:grid xl:grid-cols-[1.1fr_1fr]">
      <aside aria-hidden className="relative hidden overflow-hidden border-r border-line bg-surface-2/70 xl:flex xl:flex-col xl:justify-between xl:p-12 2xl:p-14">
        <div>
          <Logo />
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-xs font-bold text-ink shadow-2xs backdrop-blur-xs">
            {theme.badgeIcon}
            <span>{theme.badge}</span>
          </div>
        </div>

        <div className="max-w-md my-auto py-6">
          <h1 className="font-display text-3xl 2xl:text-[34px] font-extrabold leading-[1.18] tracking-tight text-ink">
            {theme.title}
          </h1>
          <p className="mt-3 text-[15px] text-ink-2 leading-relaxed">
            {theme.subtitle}
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {theme.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-ink">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
                <div>
                  <span className="text-sm font-semibold">{f.text}</span>
                  {f.sub && <span className="block text-xs text-muted mt-0.5">{f.sub}</span>}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {theme.previewWidget}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted border-t border-line/60 pt-4">
          <span>{currentCompany.name} • 24/7 Citizen & Customer Care</span>
          <span>Bilingual Hindi & English Voice AI</span>
        </div>
      </aside>

      <main id="main" className="flex min-h-dvh flex-col px-4 pb-10 pt-4 sm:px-8">
        <div className="flex items-center gap-1">
          <span className="mr-auto xl:invisible"><Logo /></span>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-2xs xl:hidden self-start">
            {theme.badgeIcon}
            <span className="truncate max-w-[240px]">{theme.badge}</span>
          </div>
          <PageTitle title={title} className="text-3xl font-extrabold tracking-tight" />
          <p className="mt-1.5 text-sm text-ink-2">{lede}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-8 border-t border-line pt-6 text-center text-ink-2">{footer}</div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [code, setCode] = useState(false);
  return (
    <AuthLayout title={t('auth.signIn')} lede={t('auth.loginLede')}
      footer={<>{t('auth.newHere')} <Link className={linkClass} to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>{t('auth.createAccountLink')}</Link>
        <span aria-hidden className="mx-2 text-muted">·</span><Link className={linkClass} to="/help">{t('auth.browseHelp')}</Link></>}>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-500/25 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-950 dark:text-sky-200">
        <span><strong>Universal Login:</strong> <code className="font-mono text-sky-700 dark:text-sky-300">xyz@gmail.com</code> / <code className="font-mono text-sky-700 dark:text-sky-300">1234</code></span>
        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase">Pre-filled</span>
      </div>
      {code ? <OtpForm mode="login" onDone={() => nav(next, { replace: true })} /> : (
        <AuthForm mode="login" pending={login.isPending} error={login.error as ApiError | null}
          onSubmit={(v) => login.mutateAsync({ email: v.email.trim(), password: v.password, remember: !!v.remember }).then(() => nav(next, { replace: true }), () => {})} />
      )}
      <button type="button" onClick={() => setCode(!code)} className={`mt-5 block w-full text-center ${linkClass}`}>{t(code ? 'otp.withPassword' : 'otp.withCode')}</button>
    </AuthLayout>
  );
}
