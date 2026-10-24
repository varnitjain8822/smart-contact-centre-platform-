import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleHelp } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { PRIORITIES, type Category } from '../../lib/types';
import { categoryKeys } from '../../lib/company';
import { categoryLabel, priorityLabel } from '../../lib/format';
import { fieldErrors, validate } from '../../lib/validate';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { FileDrop, type FileItem } from '../../ui/FileDrop';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { categoryIcon } from '../kb/CategoryGrid';

export type NewTicketValues = { subject: string; description: string; category: Category | null };
type Key = 'subject' | 'description';
/** First-response targets per priority (api sla.js TARGETS). Priority is set by triage, so this is a hint, not a choice. */
const FIRST_RESPONSE_MIN = { critical: 15, high: 60, medium: 240, low: 1440 } as const;

const card = `flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2 py-3 text-center text-sm font-semibold text-ink-2 transition-colors
  peer-hover:border-line-strong peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent
  peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus`;

export function NewTicketForm({ initial, pending, error, onSubmit, onChange, aside, files, busy, status }: {
  initial?: Partial<NewTicketValues>; pending: boolean; error?: ApiError | null;
  onSubmit(v: NewTicketValues): void; onChange(v: NewTicketValues): void; aside?: ReactNode;
  files?: { items: FileItem[]; onFiles(f: File[]): void; onRemove(id: string): void }; busy?: boolean; status?: ReactNode;
}) {
  const { t } = useTranslation();
  const [v, setV] = useState<NewTicketValues>({ subject: initial?.subject ?? '', description: initial?.description ?? '', category: initial?.category ?? null });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [sent, setSent] = useState<NewTicketValues | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const server = error?.code === 'VALIDATION_FAILED' ? fieldErrors(error.details) : {};
  const err = (k: Key) => (sent?.[k] === v[k] && server[k]) || (touched[k] ? validate[k](v[k]) : undefined);
  const set = (p: Partial<NewTicketValues>) => { const n = { ...v, ...p }; setV(n); onChange(n); };
  const len = v.description.trim().length;
  const hours = (m: number) => (m < 60 ? t('time.minutes', { count: m }) : t('time.hours', { count: m / 60 }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTouched({ subject: true, description: true });
    const bad = (['subject', 'description'] as Key[]).find((k) => validate[k](v[k]));
    if (bad) { ref.current?.querySelector<HTMLElement>(`[name="${bad}"]`)?.focus(); return; }
    setSent(v);
    onSubmit({ subject: v.subject.trim(), description: v.description.trim(), category: v.category });
  };

  return (
    <form ref={ref} noValidate onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-x-10">
      <div className="flex flex-col gap-6 xl:col-start-1">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">{t('details.topic')} <span className="font-normal text-muted">{t('common.optional')}</span></legend>
          <p className="mt-0.5 text-sm text-muted">{t('newTicket.topicHint')}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[null, ...categoryKeys()].map((c) => {
              const Icon = c ? categoryIcon(c) : CircleHelp;
              return (
                <label key={c ?? 'none'} className="relative">
                  <input type="radio" name="category" value={c ?? ''} checked={v.category === c} onChange={() => set({ category: c })}
                    className="peer absolute inset-0 cursor-pointer opacity-0" />
                  <span className={card}><Icon aria-hidden size={20} strokeWidth={1.75} /> {c ? categoryLabel(c) : t('newTicket.notSure')}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label={t('newTicket.subject')} error={err('subject')}>
          {(p) => <Input {...p} name="subject" value={v.subject} maxLength={120} required autoComplete="off"
            placeholder={t('newTicket.subjectPlaceholder')}
            onChange={(e) => set({ subject: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, subject: true }))} />}
        </Field>
        <Field label={t('newTicket.description')} error={err('description')}
          hint={<span className="flex justify-between gap-3"><span>{t('newTicket.descriptionHint')}</span>
            <span className={`tnum shrink-0 ${len > 0 && len < 20 ? 'text-warn' : ''}`}>{len < 20 ? t('newTicket.minCount', { n: len }) : `${len}/5000`}</span></span>}>
          {(p) => <Textarea {...p} name="description" value={v.description} maxLength={5000} required rows={7}
            onChange={(e) => set({ description: e.target.value })} onBlur={() => setTouched((t) => ({ ...t, description: true }))} />}
        </Field>
        {files && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-ink">{t('newTicket.attachments')} <span className="font-normal text-muted">{t('common.optional')}</span></p>
            <FileDrop items={files.items} onFiles={files.onFiles} onRemove={files.onRemove} />
          </div>
        )}
      </div>
      {aside && <div className="empty:hidden xl:col-start-2 xl:row-span-2 xl:row-start-1"><div className="flex flex-col gap-4 xl:sticky xl:top-24">{aside}</div></div>}
      <div className="flex flex-col gap-4 xl:col-start-1">
        <div className="rounded-md border border-line bg-surface-2/50 px-4 py-3">
          <p className="text-sm font-semibold text-ink">{t('newTicket.responseTitle')}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {PRIORITIES.map((p) => (
              <div key={p} className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                <dt className={p === 'critical' ? 'font-semibold text-bad' : 'text-ink-2'}>{priorityLabel(p)}</dt>
                <dd className="font-semibold text-ink tnum">{hours(FIRST_RESPONSE_MIN[p])}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted">{t('newTicket.responseHint')}</p>
        </div>
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" role="status">{busy ? t('newTicket.waitUploads') : status ?? t('newTicket.footnote')}</p>
          <Button type="submit" pending={pending} disabled={busy} className="sm:min-w-44">{t('newTicket.submit')}</Button>
        </div>
      </div>
    </form>
  );
}
