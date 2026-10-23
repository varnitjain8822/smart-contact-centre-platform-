import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api';
import { safeNext } from '../lib/validate';
import { AuthForm } from '../features/auth/AuthForm';
import { useRegister } from '../features/auth/hooks';
import { AuthLayout, linkClass } from './LoginPage';

export default function RegisterPage() {
  const { t } = useTranslation();
  const reg = useRegister();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  return (
    <AuthLayout title={t('auth.registerTitle')} lede={t('auth.registerLede')}
      footer={<>{t('auth.haveAccount')} <Link className={linkClass} to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>{t('auth.signIn')}</Link></>}>
      <AuthForm mode="register" pending={reg.isPending} error={reg.error as ApiError | null}
        onSubmit={(v) => reg.mutateAsync({ name: v.name.trim(), email: v.email.trim(), password: v.password }).then(() => nav(next, { replace: true }), () => {})} />
    </AuthLayout>
  );
}
