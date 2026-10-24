import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, SendHorizontal } from 'lucide-react';
import type { Attachment } from '../../lib/types';
import { FileList, useFileIntake } from '../../ui/FileDrop';
import { VoiceButton } from '../voice/VoiceButton';
import { useVoice } from '../voice/useVoice';
import { useUploads } from './useUploads';

const MAX = 5000;

/** Enter = newline; Ctrl/Cmd+Enter sends. Autosizes up to 6 rows. Paperclip / paste a screenshot to attach (uploads at once). */
export function Composer({ ticket, disabled, onSend, placeholder }: { ticket: string; disabled: boolean; onSend(body: string, files: Attachment[]): void; placeholder: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const files = useUploads(ticket);
  const intake = useFileIntake({ onFiles: files.add, count: files.items.length, disabled });

  const voice = useVoice({
    onTranscribed: (transcribed) => {
      setText((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
      ref.current?.focus();
    },
  });

  const body = text.trim() || files.done.map((f) => f.name).join(', ');
  const can = !disabled && !files.busy && body.length > 0 && body.length <= MAX;


  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = `${Math.min(el.scrollHeight, line * 6 + 20)}px`;
  }, [text]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    if (!can) return;
    onSend(body, files.done);
    setText('');
    files.reset();
    ref.current?.focus();
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); };

  return (
    <form onSubmit={send}
      className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 border-t border-line bg-bg/90 px-4 pb-3 pt-3 backdrop-blur-md md:bottom-0 md:mx-0 md:px-0 md:pb-4 print:hidden">
      {(files.items.length > 0 || intake.errorList) && (
        <div className="mb-2 flex max-h-48 flex-col gap-2 overflow-y-auto">{intake.errorList}<FileList items={files.items} onRemove={files.remove} /></div>
      )}
      <label htmlFor="composer" className="sr-only">{t('composer.label')}</label>
      <div className="flex items-end gap-1 rounded-md border border-line-strong bg-surface p-1.5 transition-colors focus-within:border-accent">
        <button type="button" onClick={intake.open} disabled={disabled} aria-label={t('composer.attach')} title={t('composer.attach')}
          className="grid size-11 shrink-0 place-items-center rounded-pill text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40">
          <Paperclip aria-hidden size={19} />
        </button>
        {intake.fileInput}
        <VoiceButton
          state={voice.state}
          onStart={voice.startListening}
          onStop={voice.stopListening}
          disabled={disabled}
        />
        <textarea id="composer" ref={ref} rows={1} value={text} disabled={disabled} maxLength={MAX + 500}
          aria-describedby="composer-hint" placeholder={placeholder}
          onChange={(e) => setText(e.target.value)} onKeyDown={key}
          className="max-h-48 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none" />
        <button type="submit" disabled={!can} aria-label={t('composer.send')}
          className="grid size-11 shrink-0 place-items-center rounded-pill bg-accent text-on-accent transition-opacity disabled:opacity-35">
          <SendHorizontal aria-hidden size={19} />
        </button>
      </div>
      <p id="composer-hint" className="mt-1.5 flex justify-between px-1 text-xs text-muted">
        <span className="hidden md:inline">{t('composer.hint')}</span>
        {body.length > 4500 && <span className={`tnum ml-auto ${body.length > MAX ? 'font-semibold text-bad' : ''}`}>{body.length}/{MAX}</span>}
      </p>
      {voice.error && <p role="alert" className="mt-1 px-1 text-xs text-bad">{voice.error}</p>}
      <p className="sr-only" role="status" aria-live="polite">
        {voice.state === 'listening' ? t('voice.listening') : voice.state === 'transcribing' ? t('voice.transcribing') : ''}
      </p>
    </form>
  );
}
