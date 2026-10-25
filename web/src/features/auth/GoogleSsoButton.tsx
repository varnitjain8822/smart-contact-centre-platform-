import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { safeNext } from '../../lib/validate';
import { company } from '../../lib/company';

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function GoogleSsoButton({
  mode = 'login',
  onSuccess,
}: {
  mode?: 'login' | 'register';
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = safeNext(sp.get('next'));
  const qc = useQueryClient();
  const currentCompany = company();

  const handleGoogleAuth = async (email: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.googleLogin({
        email: email.trim().toLowerCase(),
        name: name.trim() || email.split('@')[0],
      });
      qc.setQueryData(['me'], res.user);
      setIsOpen(false);
      if (onSuccess) {
        onSuccess();
      } else {
        nav(next, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Google SSO sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-2xs transition-all hover:bg-surface-2 hover:border-line-strong active:scale-[0.99] cursor-pointer"
      >
        <GoogleIcon size={19} />
        <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
        <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          SSO
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <GoogleIcon size={24} />
                <div>
                  <h3 className="text-base font-bold text-ink">Sign in with Google</h3>
                  <p className="text-xs text-muted">to continue to {currentCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                Select Google Account
              </p>

              {/* Demo 1-click Google Account */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGoogleAuth('xyz@gmail.com', 'Demo Google User')}
                className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface-2/60 p-3 text-left transition hover:border-accent hover:bg-surface-2"
              >
                <div className="grid size-10 place-items-center rounded-full bg-sky-600 font-bold text-white text-sm shadow-xs">
                  X
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">xyz@gmail.com</span>
                    <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      1-Click SSO
                    </span>
                  </div>
                  <span className="block truncate text-xs text-muted">Demo Google User • Instant Access</span>
                </div>
              </button>

              {/* Or enter custom Google Account */}
              <div className="relative my-1 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line" />
                </div>
                <span className="relative bg-surface px-2 text-[11px] uppercase tracking-wider text-muted">
                  Or enter your Google account
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Google Email</label>
                  <input
                    type="email"
                    placeholder="your-name@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Full Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading || !customEmail.includes('@')}
                  onClick={() => handleGoogleAuth(customEmail, customName)}
                  className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Authenticating with Google...' : 'Continue with this Google Account'}
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-muted">
              By continuing, Google shares your name, email address, and profile info with {currentCompany.name}.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
