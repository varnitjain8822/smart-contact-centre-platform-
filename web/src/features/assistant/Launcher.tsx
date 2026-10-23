import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useMediaQuery } from '../../lib/useMediaQuery';

const AssistantPanel = lazy(() => import('./AssistantPanel'));

/** Floating "Ask AI" button; the chat chunk loads on first open. Hidden on /assistant and on the thread page below 1280 px (composer). */
export function AssistantLauncher() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const wide = useMediaQuery('(min-width: 1280px)');
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const thread = /^\/tickets\/(?!new$)[^/]+$/.test(pathname);
  useEffect(() => setOpen(false), [pathname]);
  if (pathname === '/assistant' || (thread && !wide)) return null;
  const close = () => { setOpen(false); btn.current?.focus(); };
  return (
    <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 md:bottom-6 md:right-6 print:hidden">
      {open && <Suspense fallback={null}><AssistantPanel onClose={close} /></Suspense>}
      <button ref={btn} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog"
        title={t('assistant.launcher')}
        className={`ml-auto inline-flex min-h-12 items-center gap-2 rounded-pill bg-ai px-4 font-semibold text-on-accent shadow-pop transition-transform hover:-translate-y-px ${open ? 'max-md:hidden' : ''}`}>
        <Sparkles aria-hidden size={19} /> <span className="max-sm:sr-only">{t('assistant.launcherShort')}</span>{/* visible text is the name (WCAG 2.5.3) */}
      </button>
    </div>
  );
}
