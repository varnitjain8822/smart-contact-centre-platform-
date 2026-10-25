import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
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
import { SlaRing } from '../ui/SlaRing';

export const linkClass = 'font-semibold text-accent underline-offset-4 hover:underline';

/** Split layout: a "ticket slip" on paper (desktop), the form on the right. */
export function AuthLayout({ title, lede, children, footer }: { title: string; lede: string; children: ReactNode; footer: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh xl:grid xl:grid-cols-[1.05fr_1fr]">
      <aside aria-hidden className="relative hidden overflow-hidden border-r border-line bg-surface-2/60 xl:flex xl:flex-col xl:justify-between xl:p-14">
        <Logo />
        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink">
            <Trans i18nKey="auth.heroTitle" components={{ br: <br /> }} />
          </p>
          <p className="mt-4 text-lg text-ink-2">{t('auth.heroBody')}</p>
          <ul className="mt-6 flex flex-col gap-2.5">
            {['auth.value1', 'auth.value2', 'auth.value3'].map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-ink">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><Check size={13} strokeWidth={3} /></span>{t(k)}
              </li>
            ))}
          </ul>
          <div className="mt-10 -rotate-[1.5deg] rounded-md border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold tracking-tight text-muted tnum">SC-1042</span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-ai-soft px-2.5 py-1 text-sm font-medium text-ai">{t('status.ai_handling')}</span>
            </div>
            <p className="mt-3 font-medium text-ink">{t('auth.sampleSubject')}</p>
            <div className="mt-4 flex items-center gap-2 border-t border-dashed border-line pt-4 text-sm font-medium text-ok">
              <SlaRing fraction={0.7} tone="ok" /> <span className="tnum">{t('sla.left', { d: t('time.m', { m: 12 }) })}</span>
              <span className="text-muted">· {t('sla.firstResponse')}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted">{t('auth.heroFoot')}</p>
      </aside>
      <main id="main" className="flex min-h-dvh flex-col px-4 pb-10 pt-4 sm:px-8">
        <div className="flex items-center gap-1">
          <span className="mr-auto xl:invisible"><Logo /></span>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <PageTitle title={title} className="text-3xl" />
          <p className="mt-2 text-ink-2">{lede}</p>
          <div className="mt-8">{children}</div>
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
