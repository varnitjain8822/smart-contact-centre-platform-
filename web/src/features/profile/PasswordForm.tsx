import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { fieldErrors, validate } from '../../lib/validate';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Input } from '../../ui/Input';

type V = { currentPassword: string; newPassword: string };

export function PasswordForm({ onSave, pending, error }: { onSave(v: V): Promise<unknown>; pending: boolean; error?: ApiError | null }) {
  const { t } = useTranslation();
  const [v, setV] = useState<V>({ currentPassword: '', newPassword: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [sent, setSent] = useState<V | null>(null);
  const server: Partial<Record<keyof V, string>> = error?.code === 'WRONG_PASSWORD'
    ? { currentPassword: t('profile.wrongPassword') }
    : error?.code === 'VALIDATION_FAILED' ? fieldErrors(error.details) : {};
  const client = { currentPassword: v.currentPassword ? undefined : t('profile.currentRequired'), newPassword: validate.password(v.newPassword) };
  const err = (k: keyof V) => (sent?.[k] === v[k] && server[k]) || (touched[k] ? client[k] : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ currentPassword: true, newPassword: true });
    if (client.currentPassword || client.newPassword) return;
    setSent(v);
    onSave(v).then(() => { setV({ currentPassword: '', newPassword: '' }); setTouched({}); setSent(null); }, () => {});
  };
  const f = (k: keyof V, label: string, auto: string, hint?: string) => (
    <Field label={label} error={err(k)} hint={hint}>
      {(p) => <Input {...p} name={k} type="password" autoComplete={auto} value={v[k]}
        onChange={(e) => setV({ ...v, [k]: e.target.value })} onBlur={() => setTouched({ ...touched, [k]: true })} />}
    </Field>
  );
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {f('currentPassword', t('profile.currentPassword'), 'current-password')}
      {f('newPassword', t('profile.newPassword'), 'new-password', t('auth.passwordHint'))}
      <div><Button type="submit" variant="secondary" pending={pending}>{t('profile.changePassword')}</Button></div>
    </form>
  );
}
