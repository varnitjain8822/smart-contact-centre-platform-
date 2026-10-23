import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Languages, LaptopMinimal, LogOut, Mail, Monitor, Moon, Sun } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useTheme, type ThemePref } from '../lib/theme';
import { useChangePassword, useLogout, useLogoutOthers, useMe, useUpdateMe } from '../features/auth/hooks';
import type { NotifyPrefs } from '../lib/types';
import { ProfileForm } from '../features/profile/ProfileForm';
import { PasswordForm } from '../features/profile/PasswordForm';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { PageTitle } from '../ui/PageTitle';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { useLocale } from '../lib/locale';

const THEMES: { value: ThemePref; icon: typeof Sun }[] = [{ value: 'system', icon: Monitor }, { value: 'light', icon: Sun }, { value: 'dark', icon: Moon }];
const LANGS = [{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }] as const;

const tile = `flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-sm border border-line text-sm font-semibold text-ink-2 transition-colors
  peer-hover:border-line-strong peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent
  peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus`;

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-ink-2">{desc}</p>
      {children}
    </Card>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const user = useMe().data;
  const logout = useLogout();
  const nav = useNavigate();
  const signOut = () => logout.mutate(undefined, { onSettled: () => nav('/login') });
  const name = useUpdateMe();
  const prefs = useUpdateMe();
  const pw = useChangePassword();
  const others = useLogoutOthers();
  const [confirmOthers, setConfirmOthers] = useState(false);
  const { pref, setPref } = useTheme();
  const toast = useToast();
  if (!user) return null; // RequireAuth redirects

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0">
          <PageTitle title={t('nav.profile')} className="text-3xl md:text-[40px]" />
          <p className="truncate text-ink-2">{user.email}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-5">
        <Section title={t('profile.detailsTitle')} desc={t('profile.detailsDesc')}>
          <ProfileForm key={`${user.name}|${user.phone}|${user.organization}`} email={user.email} pending={name.isPending} error={name.error as ApiError | null}
            initial={{ name: user.name, phone: user.phone ?? '', organization: user.organization ?? '' }}
            onSave={(v) => name.mutate(v, { onSuccess: () => toast(t('profile.detailsSaved'), 'ok') })} />
        </Section>
        <Section title={t('profile.passwordTitle')} desc={t('profile.passwordDesc')}>
          <PasswordForm pending={pw.isPending} error={pw.error as ApiError | null}
            onSave={(v) => pw.mutateAsync(v).then(() => toast(t('profile.passwordChanged'), 'ok'))} />
        </Section>
        <Section title={t('profile.devicesTitle')} desc={t('profile.devicesDesc')}>
          <Button variant="secondary" pending={others.isPending} onClick={() => setConfirmOthers(true)}>
            <LaptopMinimal aria-hidden size={18} /> {t('profile.signOutOthers')}
          </Button>
          <Dialog open={confirmOthers} title={t('profile.signOutOthersTitle')} onClose={() => setConfirmOthers(false)}>
            <p className="text-ink-2">{t('profile.signOutOthersBody')}</p>
            <form method="dialog" className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setConfirmOthers(false)}>{t('profile.cancel')}</Button>
              <Button onClick={() => { setConfirmOthers(false); others.mutate(undefined, {
                onSuccess: () => toast(t('profile.signedOutOthers'), 'ok'), onError: () => toast(t('toast.actionFailed'), 'bad') }); }}>
                {t('profile.signOutOthers')}
              </Button>
            </form>
          </Dialog>
        </Section>
        <Section title={t('profile.appearanceTitle')} desc={t('profile.appearanceDesc')}>
          <fieldset>
            <legend className="sr-only">{t('profile.theme')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, icon: Icon }) => (
                <label key={value} className="relative">
                  <input type="radio" name="theme" value={value} checked={pref === value} onChange={() => setPref(value)} className="peer absolute inset-0 cursor-pointer opacity-0" />
                  <span className={tile}><Icon aria-hidden size={20} /> {t(`theme.${value}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>
        <Section title={t('profile.languageTitle')} desc={t('profile.languageDesc')}>
          <fieldset>
            <legend className="sr-only">{t('shell.language')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {LANGS.map(({ value, label }) => (
                <label key={value} className="relative">
                  <input type="radio" name="locale" value={value} checked={locale === value} onChange={() => setLocale(value)} className="peer absolute inset-0 cursor-pointer opacity-0" />
                  <span className={tile} lang={value}><Languages aria-hidden size={20} /> {label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>
        <Section title={t('profile.notifyTitle')} desc={t('profile.notifyDesc')}>
          <NotifyForm prefs={user.notify ?? DEFAULT_NOTIFY}
            onChange={(notify) => prefs.mutate({ notify }, { onSuccess: () => toast(t('profile.notifySaved'), 'ok'), onError: () => toast(t('toast.actionFailed'), 'bad') })} />
        </Section>
        <div className="xl:hidden">
          <Button variant="secondary" className="w-full" onClick={signOut}><LogOut aria-hidden size={18} /> {t('auth.signOut')}</Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_NOTIFY: NotifyPrefs = { email: { reply: true, status: true, sla: true }, inApp: true };

/** Each switch saves on its own (PATCH merges only the flags sent). */
function NotifyForm({ prefs, onChange }: { prefs: NotifyPrefs; onChange(p: { email?: Partial<NotifyPrefs['email']>; inApp?: boolean }): void }) {
  const { t } = useTranslation();
  const row = (id: string, label: string, hint: string, checked: boolean, set: (v: boolean) => void) => (
    <li key={id} className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block font-semibold text-ink">{label}</span>
        <span className="block text-sm text-ink-2">{hint}</span>
      </label>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => set(e.target.checked)}
        className="relative mt-1 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-pill bg-line-strong/60 transition-colors checked:bg-accent
          before:absolute before:left-1 before:top-1 before:size-5 before:rounded-full before:bg-surface before:shadow-card before:transition-transform checked:before:translate-x-5" />
    </li>
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="flex items-center gap-2 font-text text-sm font-semibold uppercase tracking-[0.08em] text-muted"><Bell aria-hidden size={15} /> {t('profile.inApp')}</h3>
        <ul className="divide-y divide-line">
          {row('n-inapp', t('profile.inAppLabel'), t('profile.inAppHint'), prefs.inApp, (v) => onChange({ inApp: v }))}
        </ul>
      </div>
      <div>
        <h3 className="flex items-center gap-2 font-text text-sm font-semibold uppercase tracking-[0.08em] text-muted"><Mail aria-hidden size={15} /> {t('profile.email')}</h3>
        <ul className="divide-y divide-line">
          {(['reply', 'status', 'sla'] as const).map((k) =>
            row(`n-${k}`, t(`profile.email_${k}`), t(`profile.email_${k}Hint`), prefs.email[k], (v) => onChange({ email: { [k]: v } })))}
        </ul>
      </div>
    </div>
  );
}
