import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, Star } from 'lucide-react';
import type { TicketDetail } from '../../lib/types';
import { Button } from '../../ui/Button';

const LEVELS = ['veryPoor', 'poor', 'okay', 'good', 'excellent'];

export function CsatCard({ canRate, csat, onRate, pending }: {
  canRate: boolean; csat: TicketDetail['csat']; onRate(r: number, c: string): void; pending?: boolean;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  if (csat)
    return (
      <div role="status" className="arrive flex items-center gap-3 rounded-md border border-ok/25 bg-ok/10 px-4 py-3">
        <CircleCheck aria-hidden size={20} className="shrink-0 text-ok" />
        <p className="text-ink"><strong className="font-semibold">{t('csat.thanks', { rating: csat.rating })}</strong>
          {csat.comment && <span className="text-ink-2"> “{csat.comment}”</span>}</p>
      </div>
    );
  if (!canRate) return null;
  const submit = (e: FormEvent) => { e.preventDefault(); if (rating) onRate(rating, comment.trim()); };
  return (
    <form onSubmit={submit} className="arrive rounded-md border border-line bg-surface p-5 shadow-card">
      <fieldset>
        <legend className="font-display text-lg font-semibold text-ink">{t('csat.title')}</legend>
        <p className="mt-1 text-sm text-ink-2">{t('csat.lede')}</p>
        <div className="mt-4 flex gap-1">
          {LEVELS.map((k, i) => {
            const l = t(`csat.${k}`);
            const v = i + 1;
            return (
              <label key={v} className="relative" title={l}>
                <input type="radio" name="rating" value={v} checked={rating === v} onChange={() => setRating(v)}
                  className="peer absolute inset-0 cursor-pointer opacity-0" aria-label={`${v} — ${l}`} />
                <span className="grid size-12 place-items-center rounded-sm text-line-strong transition-colors peer-hover:text-warn peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                  <Star aria-hidden size={30} strokeWidth={1.5} className={v <= rating ? 'fill-warn text-warn' : ''} />
                </span>
              </label>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-1 h-5 text-sm font-medium text-ink-2">{rating ? t(`csat.${LEVELS[rating - 1]}`) : ''}</p>
      </fieldset>
      <label htmlFor="csat-comment" className="mt-3 block text-sm font-semibold text-ink">{t('csat.comment')} <span className="font-normal text-muted">{t('common.optional')}</span></label>
      <textarea id="csat-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={2}
        aria-describedby="csat-count"
        className="mt-1.5 w-full rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink focus-visible:border-accent" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span id="csat-count" className="text-xs text-muted tnum">{comment.length}/1000</span>
        <Button type="submit" disabled={!rating} pending={pending}>{t('csat.send')}</Button>
      </div>
    </form>
  );
}
