import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api';
import { useCreateTicket } from '../features/tickets/hooks';
import { NewTicketForm, type NewTicketValues } from '../features/tickets/NewTicketForm';
import { SuggestionPanel } from '../features/tickets/SuggestionPanel';
import { useUploads } from '../features/tickets/useUploads';
import { useDebounced } from '../lib/useDebounced';
import { PageTitle } from '../ui/PageTitle';
import { useToast } from '../ui/Toast';

const DRAFT = 'scc-ticket-draft';
const readDraft = (): Partial<NewTicketValues> | null => { try { return JSON.parse(localStorage.getItem(DRAFT) ?? 'null'); } catch { return null; } };
const writeDraft = (v: NewTicketValues | null) => {
  try { if (v && (v.subject.trim() || v.description.trim())) localStorage.setItem(DRAFT, JSON.stringify(v)); else localStorage.removeItem(DRAFT); } catch { /* storage off */ }
};

export default function NewTicketPage() {
  const { t } = useTranslation();
  const [sp] = useSearchParams();
  const prefill = useLocation().state as Partial<NewTicketValues> | null; // from "Convert to ticket"
  const [start] = useState(() => {
    const subject = sp.get('subject')?.slice(0, 120);
    if (prefill?.subject || prefill?.description) return { values: prefill, restored: false };
    if (subject) return { values: { subject }, restored: false };
    const d = readDraft();
    return { values: d ?? {}, restored: !!d };
  });
  const [formKey, setFormKey] = useState(0);
  const [restored, setRestored] = useState(start.restored);
  const [draft, setDraft] = useState<NewTicketValues>({ subject: start.values.subject ?? '', description: start.values.description ?? '', category: start.values.category ?? null });
  const saved = useDebounced(draft, 600);
  const dirty = useRef(false);
  useEffect(() => { if (dirty.current) writeDraft(saved); }, [saved]);
  const idemKey = useRef(crypto.randomUUID()); // same key on every retry/double-tap → one ticket
  const create = useCreateTicket();
  const files = useUploads(null);
  const nav = useNavigate();
  const toast = useToast();

  const submit = (v: NewTicketValues) => {
    if (create.isPending) return;
    const attachmentIds = files.done.map((a) => a.id);
    create.mutate({ ...v, ...(attachmentIds.length && { attachmentIds }), idemKey: idemKey.current }, {
      onSuccess: ({ ticket }) => { idemKey.current = crypto.randomUUID(); dirty.current = false; writeDraft(null); nav(`/tickets/${ticket.number}`); },
      onError: (e) => {
        if (e instanceof ApiError && e.code === 'RATE_LIMITED') toast(e.retryAfterS ? t('common.rateLimitedIn', { s: e.retryAfterS }) : t('common.rateLimited'), 'bad');
        else if (e instanceof ApiError && e.code === 'INVALID_ATTACHMENT') toast(t('upload.invalid'), 'bad');
        else if (!(e instanceof ApiError && e.code === 'VALIDATION_FAILED')) toast(t('newTicket.submitFailed'), 'bad');
      },
    });
  };
  const discard = () => { writeDraft(null); dirty.current = false; setRestored(false); setDraft({ subject: '', description: '', category: null }); setFormKey((k) => k + 1); };

  return (
    <div className="mx-auto max-w-2xl xl:max-w-5xl">
      <PageTitle title={t('nav.newTicket')} className="text-3xl md:text-[40px]" />
      <p className="mb-8 mt-2 text-ink-2">{t('newTicket.lede')}</p>
      {restored && (
        <p role="status" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-info/30 bg-info/10 px-4 py-2.5 text-[15px] text-ink">
          {t('newTicket.restored')}
          <button type="button" onClick={discard} className="min-h-11 font-semibold text-accent underline underline-offset-4 hover:no-underline">{t('newTicket.discard')}</button>
        </p>
      )}
      <NewTicketForm key={formKey} initial={draft} pending={create.isPending} error={create.error as ApiError | null}
        onSubmit={submit} onChange={(v) => { dirty.current = true; setDraft(v); }}
        files={{ items: files.items, onFiles: files.add, onRemove: files.remove }} busy={files.busy}
        status={dirty.current && (draft.subject || draft.description) ? t('newTicket.draftSaved') : undefined}
        aside={<SuggestionPanel subject={draft.subject} description={draft.description} />} />
    </div>
  );
}
