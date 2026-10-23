import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize2, Sparkles, X } from 'lucide-react';
import { AssistantChat } from './AssistantChat';

/** Non-modal chat panel above the launcher (full screen on phones). Esc closes. */
export default function AssistantPanel({ onClose }: { onClose(): void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-labelledby="assistant-panel-h"
      className="arrive flex flex-col overflow-hidden border border-line bg-bg shadow-pop max-md:fixed max-md:inset-0 max-md:z-50 md:mb-3 md:h-[min(620px,calc(100dvh-120px))] md:w-[400px] md:rounded-md">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <Sparkles aria-hidden size={18} className="text-ai" />
        <h2 id="assistant-panel-h" className="mr-auto font-text text-base font-semibold">{t('nav.assistant')}</h2>
        <Link to="/assistant" aria-label={t('assistant.expand')} title={t('assistant.expand')}
          className="grid size-11 place-items-center rounded-pill text-ink-2 hover:bg-surface-2 hover:text-ink"><Maximize2 aria-hidden size={17} /></Link>
        <button type="button" onClick={onClose} aria-label={t('assistant.close')}
          className="grid size-11 place-items-center rounded-pill text-ink-2 hover:bg-surface-2 hover:text-ink"><X aria-hidden size={19} /></button>
      </div>
      <AssistantChat compact onNavigate={onClose} />
    </div>
  );
}
