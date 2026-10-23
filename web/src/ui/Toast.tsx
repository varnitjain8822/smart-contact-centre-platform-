import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

type Tone = 'info' | 'ok' | 'bad';
type T = { id: number; text: string; tone: Tone };
const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});
const ICON = { info: Info, ok: CircleCheck, bad: CircleAlert };

/** Polite live region; toasts auto-dismiss after 5 s. `sticky` slot for persistent status (e.g. Reconnecting…). */
export function ToastProvider({ children, sticky }: { children: ReactNode; sticky?: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const n = useRef(0);
  const toast = useCallback((text: string, tone: Tone = 'info') => {
    const id = ++n.current;
    setItems((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div role="status" aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {sticky}
        {items.map((t) => {
          const I = ICON[t.tone];
          return (
            <div key={t.id} className="arrive pointer-events-auto flex max-w-md items-center gap-2.5 rounded-pill bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-card">
              <I aria-hidden size={18} className="shrink-0" />
              {t.text}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
