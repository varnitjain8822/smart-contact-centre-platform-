import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { api, ApiError, type OtpTarget } from '../../lib/api';
import { normPhone, validate } from '../../lib/validate';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Input } from '../../ui/Input';
import { useOtpVerify } from './hooks';

function message(t: TFunction, e: unknown) {
  if (!(e instanceof ApiError)) return undefined;
  if (e.code === 'OTP_INVALID') return t('otp.wrong', { count: Number((e.details as { attemptsLeft?: number })?.attemptsLeft ?? 0) });
  if (e.code === 'OTP_EXPIRED') return t('otp.expired');
  if (e.code === 'OTP_SEND_FAILED') return t('otp.sendFailed');
  if (e.code === 'ACCOUNT_NOT_FOUND') return t('otp.noAccount');
  if (e.code === 'RATE_LIMITED') return e.retryAfterS ? t('common.rateLimitedIn', { s: e.retryAfterS }) : t('common.rateLimited');
  return e.message;
}

/**
 * Sign in (or, with a name, sign up) with a 6-digit code sent by email — or SMS when the server has it configured.
 * Step 1 asks where to send it, step 2 takes the code (autofill via autocomplete="one-time-code") with a resend timer.
 */
export function OtpForm({ mode, onDone }: { mode: 'login' | 'register'; onDone(): void }) {
  const { t, i18n } = useTranslation();
  const opts = useQuery({ queryKey: ['otp-options'], queryFn: api.otpOptions, staleTime: 5 * 60_000 });
  const verify = useOtpVerify();
  const [byPhone, setByPhone] = useState(false);
  const [v, setV] = useState({ name: '', email: '', phone: '', code: '' });
  const [step, setStep] = useState<'id' | 'code'>('id');
  const [needName, setNeedName] = useState(mode === 'register');
  const [err, setErr] = useState<Record<string, string | undefined>>({});
  const [sending, setSending] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (resendAt <= now) return undefined; const id = setTimeout(() => setNow(Date.now()), 1000); return () => clearTimeout(id); }, [resendAt, now]);

  const locale = i18n.language === 'hi' ? 'hi' : 'en';
  const target = (): OtpTarget => (byPhone ? { phone: normPhone(v.phone) } : { email: v.email.trim() });
  const to = byPhone ? normPhone(v.phone) : v.email.trim();
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const bad = {
      name: needName ? validate.name(v.name) : undefined,
      email: !byPhone ? validate.email(v.email) : undefined,
      phone: byPhone ? (v.phone.trim() ? validate.phone(v.phone) : t('validate.phone')) : undefined,
    };
    setErr(bad);
    if (Object.values(bad).some(Boolean)) return;
    setSending(true);
    try {
      const r = await api.otpRequest({ ...target(), locale });
      setStep('code');
      setResendAt(Date.now() + r.resendInS * 1000); setNow(Date.now());
    } catch (x) { setErr({ form: message(t, x) }); } finally { setSending(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const bad = { code: /^\d{6}$/.test(v.code.trim()) ? undefined : t('otp.codeRequired'), name: needName ? validate.name(v.name) : undefined };
    setErr(bad);
    if (Object.values(bad).some(Boolean)) return;
    try {
      await verify.mutateAsync({ ...target(), code: v.code.trim(), ...(needName && { name: v.name.trim() }), locale, remember: false });
      onDone();
    } catch (x) {
      if (x instanceof ApiError && x.code === 'ACCOUNT_NOT_FOUND') setNeedName(true);
      setErr({ form: message(t, x) });
    }
  };

  const nameField = needName && (
    <Field label={t('auth.name')} error={err.name}>
      {(p) => <Input {...p} name="name" autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
    </Field>
  );
  const alert = err.form && <p role="alert" className="rounded-sm border border-bad/30 bg-bad/10 px-3.5 py-3 text-sm font-medium text-bad">{err.form}</p>;
  const linkBtn = 'self-start text-sm font-semibold text-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline';

  if (step === 'id') {
    return (
      <form noValidate onSubmit={send} className="flex flex-col gap-5">
        {alert}
        {nameField}
        {byPhone ? (
          <Field label={t('otp.phone')} error={err.phone} hint={t('otp.phoneHint')}>
            {(p) => <Input {...p} name="phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />}
          </Field>
        ) : (
          <Field label={t('auth.email')} error={err.email}>
            {(p) => <Input {...p} name="email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />}
          </Field>
        )}
        {mode === 'login' && opts.data?.sms && (
          <button type="button" className={linkBtn} onClick={() => { setByPhone(!byPhone); setErr({}); }}>{t(byPhone ? 'otp.useEmail' : 'otp.usePhone')}</button>
        )}
        <Button type="submit" pending={sending} className="mt-1 w-full">{t('otp.send')}</Button>
      </form>
    );
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-ink-2" aria-live="polite">{t('otp.sentTo', { to })}</p>
      {alert}
      {nameField}
      <Field label={t('otp.code')} error={err.code}>
        {(p) => <Input {...p} name="code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="\d{6}" value={v.code}
          onChange={(e) => setV({ ...v, code: e.target.value.replace(/\D/g, '') })} />}
      </Field>
      <Button type="submit" pending={verify.isPending} className="mt-1 w-full">{t(needName ? 'auth.createAccount' : 'auth.signIn')}</Button>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className={linkBtn} disabled={wait > 0 || sending} onClick={() => void send()}>
          {wait > 0 ? t('otp.resendIn', { s: wait }) : t('otp.resend')}
        </button>
        <button type="button" className={linkBtn} onClick={() => { setStep('id'); setV({ ...v, code: '' }); setErr({}); }}>{t('otp.change')}</button>
      </div>
    </form>
  );
}
