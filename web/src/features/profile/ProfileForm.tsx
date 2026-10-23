import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { fieldErrors, normPhone, validate } from '../../lib/validate';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Input } from '../../ui/Input';

export type Details = { name: string; phone: string; organization: string };
type K = keyof Details;

/** Name, phone, organisation. Sends only changed fields; '' clears phone/organisation. */
export function ProfileForm({ initial, email, onSave, pending, error }: {
  initial: Details; email: string; onSave(v: Partial<Details>): void; pending: boolean; error?: ApiError | null;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [sent, setSent] = useState<Details | null>(null);
  const server: Partial<Record<K, string>> = error?.code === 'VALIDATION_FAILED' ? fieldErrors(error.details) : {};
  const err = (k: K) => (sent?.[k] === v[k] && server[k]) || (touched[k] ? validate[k](v[k]) : undefined);
  const clean = (k: K, x: string) => (k === 'phone' ? normPhone(x) : x.trim());
  const changed = (Object.keys(v) as K[]).filter((k) => clean(k, v[k]) !== clean(k, initial[k]));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, organization: true });
    if ((Object.keys(v) as K[]).some((k) => validate[k](v[k]))) return;
    setSent(v);
    onSave(Object.fromEntries(changed.map((k) => [k, clean(k, v[k])])));
  };
  const f = (k: K, label: string, auto: string, type = 'text', hint?: string) => (
    <Field label={label} error={err(k)} hint={hint} optional={k !== 'name'}>
      {(p) => <Input {...p} name={k} type={type} autoComplete={auto} value={v[k]}
        onChange={(e) => setV({ ...v, [k]: e.target.value })} onBlur={() => setTouched({ ...touched, [k]: true })} />}
    </Field>
  );
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {f('name', t('profile.displayName'), 'name')}
      <Field label={t('auth.email')} hint={t('profile.emailHint')}>
        {(p) => <Input {...p} type="email" value={email} readOnly className="bg-surface-2 text-ink-2" />}
      </Field>
      {f('phone', t('profile.phone'), 'tel', 'tel', t('profile.phoneHint'))}
      {f('organization', t('profile.organization'), 'organization')}
      <div><Button type="submit" pending={pending} disabled={!changed.length}>{t('profile.saveDetails')}</Button></div>
    </form>
  );
}
