import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, Sparkles } from 'lucide-react';
import { useMediaQuery } from '../../lib/useMediaQuery';

const AssistantPanel = lazy(() => import('./AssistantPanel'));

/** Floating "Ask AI" button; the chat chunk loads on first open. Hidden on /assistant, on Home (which has its own Ask AI buttons, and the floating one sat over its article list) and on the thread page below 1280 px (composer). */
export function AssistantLauncher() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const wide = useMediaQuery('(min-width: 1280px)');
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const thread = /^\/tickets\/(?!new$)[^/]+$/.test(pathname);
  useEffect(() => setOpen(false), [pathname]);
  if (pathname === '/assistant' || pathname === '/' || (thread && !wide)) return null;
  const close = () => { setOpen(false); btn.current?.focus(); };
  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 md:bottom-6 md:right-6 print:hidden">
      {open && <Suspense fallback={null}><AssistantPanel onClose={close} /></Suspense>}
      <button ref={btn} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog"
        title={t('assistant.launcher')}
        className={`ml-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#0082f5] to-[#00b9f5] hover:from-[#0070eb] hover:to-[#00a6f4] px-4 font-semibold text-white shadow-lg shadow-sky-500/30 ring-2 ring-white/50 transition-all hover:scale-105 active:scale-95 ${open ? 'max-md:hidden' : ''}`}>
        <Mic aria-hidden size={18} />
        <Sparkles aria-hidden size={16} />
        <span className="max-sm:sr-only text-sm font-bold">{t('assistant.launcherShort')}</span>
      </button>
    </div>
  );
}
