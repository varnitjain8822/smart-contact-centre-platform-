import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

/** Search help articles; submitting goes to /help?q=. */
export function KbSearchBox({ initial = '', label, size = 'md' }: { initial?: string; label?: string; size?: 'md' | 'lg' }) {
  const { t } = useTranslation();
  const [q, setQ] = useState(initial);
  const nav = useNavigate();
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim().slice(0, 100);
    nav(t ? `/help?q=${encodeURIComponent(t)}` : '/help');
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <label htmlFor={id} className="sr-only">{label ?? t('kb.search')}</label>
      <Search aria-hidden size={size === 'lg' ? 22 : 19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100}
        placeholder={t('kb.search')} enterKeyHint="search"
        className={`w-full rounded-pill border border-line-strong bg-surface pl-12 pr-28 text-ink placeholder:text-muted transition-colors hover:border-ink-2 focus-visible:border-accent ${size === 'lg' ? 'min-h-14 text-lg' : 'min-h-12'}`} />
      <button type="submit" className="absolute right-1.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center rounded-pill bg-ink px-4 text-sm font-semibold text-bg hover:bg-ink/85">
        {t('kb.submit')}
      </button>
    </form>
  );
}
