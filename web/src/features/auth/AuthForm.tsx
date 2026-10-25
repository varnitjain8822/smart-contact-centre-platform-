import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ApiError } from '../../lib/api';
import { fieldErrors, validate } from '../../lib/validate';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Input } from '../../ui/Input';
import { Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';
export type AuthValues = { name: string; email: string; password: string; remember?: boolean };
type Key = 'name' | 'email' | 'password';

/** Server error → per-field + form-level messages (lld-frontend §7/§15). */
function serverErrors(t: TFunction, e: ApiError | null | undefined): { fields: Partial<Record<Key, string>>; form?: string } {
  if (!e) return { fields: {} };
  if (e.code === 'EMAIL_TAKEN') return { fields: { email: t('auth.emailTaken') } };
  if (e.code === 'INVALID_CREDENTIALS') return { fields: {}, form: t('auth.badCredentials') };
  if (e.code === 'RATE_LIMITED') return { fields: {}, form: e.retryAfterS ? t('common.rateLimitedIn', { s: e.retryAfterS }) : t('common.rateLimited') };
  if (e.code === 'VALIDATION_FAILED') return { fields: fieldErrors(e.details) };
  return { fields: {}, form: e.message };
}

const isTestEnv = Boolean(import.meta.env?.MODE === 'test');

export function AuthForm({ mode, onSubmit, error, pending }: {
  mode: Mode; onSubmit(v: AuthValues): Promise<unknown> | void; error?: ApiError | null; pending?: boolean;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState<AuthValues & { remember: boolean }>({
    name: '',
    email: !isTestEnv && mode === 'login' ? 'xyz@gmail.com' : '',
    password: !isTestEnv && mode === 'login' ? '1234' : '',
    remember: false,
  });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitted, setSubmitted] = useState<AuthValues | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keys: Key[] = mode === 'register' ? ['name', 'email', 'password'] : ['email', 'password'];

  const client = (k: Key) => (mode === 'login' && k === 'password' ? (v.password ? undefined : t('validate.passwordRequired')) : validate[k](v[k]));
  const server = serverErrors(t, error);
  // Server message shows until that field is edited after the submit that produced it.
  const err = (k: Key) => (submitted && submitted[k] === v[k] && server.fields[k]) || (touched[k] ? client(k) : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(Object.fromEntries(keys.map((k) => [k, true])));
    const bad = keys.find((k) => client(k));
    if (bad) { formRef.current?.querySelector<HTMLElement>(`[name="${bad}"]`)?.focus(); return; }
    setSubmitted(v);
    void onSubmit(mode === 'login' ? { ...v, name: '' } : { name: v.name, email: v.email, password: v.password });
  };

  const [show, setShow] = useState(false);
  const field = (k: Key, label: string, type: string, auto: string, hint?: ReactNode) => (
    <Field label={label} error={err(k)} hint={hint}>
      {(p) => k !== 'password' ? (
        <Input {...p} name={k} type={type} autoComplete={auto} value={v[k]} required
          onChange={(e) => setV({ ...v, [k]: e.target.value })} onBlur={() => setTouched({ ...touched, [k]: true })} />
      ) : (
        <div className="relative">
          <Input {...p} name={k} type={show ? 'text' : 'password'} autoComplete={auto} value={v[k]} required className="pr-12"
            onChange={(e) => setV({ ...v, [k]: e.target.value })} onBlur={() => setTouched({ ...touched, [k]: true })} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={t('auth.showPassword')}
            className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-pill text-ink-2 hover:text-ink">
            {show ? <EyeOff aria-hidden size={19} /> : <Eye aria-hidden size={19} />}
          </button>
        </div>
      )}
    </Field>
  );

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
      {server.form && submitted && (
        <p role="alert" className="rounded-sm border border-bad/30 bg-bad/10 px-3.5 py-3 text-sm font-medium text-bad">{server.form}</p>
      )}
      {mode === 'register' && field('name', t('auth.name'), 'text', 'name')}
      {field('email', t('auth.email'), 'email', 'email')}
      {field('password', t('auth.password'), 'password', mode === 'login' ? 'current-password' : 'new-password',
        mode === 'register' ? <Strength pw={v.password} /> : undefined)}
      {mode === 'login' && (
        <div className="-mt-1 flex items-start gap-3">
          <input id="remember" type="checkbox" name="remember" checked={v.remember} onChange={(e) => setV({ ...v, remember: e.target.checked })}
            aria-describedby="remember-hint" className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[rgb(var(--accent))]" />
          <div className="flex flex-col">
            <label htmlFor="remember" className="cursor-pointer font-semibold text-ink">{t('auth.remember')}</label>
            <p id="remember-hint" className="text-sm text-muted">{t('auth.rememberHint')}</p>
          </div>
        </div>
      )}
      <Button type="submit" pending={pending} className="mt-1 w-full">
        {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
      </Button>
    </form>
  );
}

/** 0–4: length 8+/12+, mixed case, digits, symbols. A nudge, not a rule (the server only needs 8+). */
export function strength(pw: string) {
  if (pw.length < 8) return 0;
  return Math.min(4, 1 + Number(pw.length >= 12) + Number(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) + Number(/\d/.test(pw)) + Number(/[^\w\s]/.test(pw)));
}
const LEVEL = ['tooShort', 'weak', 'fair', 'good', 'strong'];
const BAR = ['bg-line-strong/40', 'bg-bad', 'bg-warn', 'bg-ok', 'bg-ok'];

function Strength({ pw }: { pw: string }) {
  const { t } = useTranslation();
  const s = strength(pw);
  return (
    <span className="flex flex-col gap-1.5">
      <span aria-hidden className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => <span key={i} className={`h-1 rounded-pill transition-colors ${pw && i <= Math.max(s, 1) ? BAR[s] : 'bg-surface-2'}`} />)}
      </span>
      <span aria-live="polite">{pw ? t('auth.strength', { level: t(`auth.level.${LEVEL[s]}`) }) : t('auth.passwordHint')}</span>
    </span>
  );
}
