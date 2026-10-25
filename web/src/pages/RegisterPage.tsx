import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api';
import { safeNext } from '../lib/validate';
import { AuthForm } from '../features/auth/AuthForm';
import { OtpForm } from '../features/auth/OtpForm';
import { useRegister } from '../features/auth/hooks';
import { AuthLayout, linkClass } from './LoginPage';
import { GoogleSsoButton } from '../features/auth/GoogleSsoButton';

export default function RegisterPage() {
  const { t } = useTranslation();
  const reg = useRegister();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const [code, setCode] = useState(false);
  return (
    <AuthLayout title={t('auth.registerTitle')} lede={t('auth.registerLede')}
      footer={<>{t('auth.haveAccount')} <Link className={linkClass} to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>{t('auth.signIn')}</Link></>}>
      <div className="mb-4">
        <GoogleSsoButton mode="register" onSuccess={() => nav(next, { replace: true })} />
      </div>

      <div className="relative my-4 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-surface px-2.5 text-[11px] uppercase tracking-wider text-muted font-medium">
          or register with email
        </span>
      </div>

      {code ? <OtpForm mode="register" onDone={() => nav(next, { replace: true })} /> : (
        <AuthForm mode="register" pending={reg.isPending} error={reg.error as ApiError | null}
          onSubmit={(v) => reg.mutateAsync({ name: v.name.trim(), email: v.email.trim(), password: v.password }).then(() => nav(next, { replace: true }), () => {})} />
      )}
      <button type="button" onClick={() => setCode(!code)} className={`mt-5 block w-full text-center ${linkClass}`}>{t(code ? 'otp.registerWithPassword' : 'otp.registerWithCode')}</button>
    </AuthLayout>
  );
}
