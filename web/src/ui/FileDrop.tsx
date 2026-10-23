import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ImagePlus, X } from 'lucide-react';

export type FileItem = { id: string; file: File; progress?: number; error?: string };
export const DEFAULT_ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'];

const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Validation + paste-a-screenshot + hidden file input, shared by FileDrop and compact pickers (Composer). */
export function useFileIntake({ onFiles, count, accept = DEFAULT_ACCEPT, maxSizeMB = 10, maxFiles = 5, paste = true, disabled }: {
  onFiles(files: File[]): void; count: number; accept?: string[]; maxSizeMB?: number; maxFiles?: number; paste?: boolean; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const take = (list: File[]) => {
    const errs: string[] = [];
    const room = maxFiles - count;
    const ok = list.filter((f) => {
      if (!accept.includes(f.type)) return errs.push(t('fileDrop.badType', { name: f.name })), false;
      if (f.size > maxSizeMB * 1048576) return errs.push(t('fileDrop.tooBig', { name: f.name, max: maxSizeMB })), false;
      return true;
    });
    if (ok.length > room) errs.push(t('fileDrop.tooMany', { count: maxFiles }));
    setErrors(errs);
    if (ok.length && room > 0) onFiles(ok.slice(0, room));
  };
  const takeRef = useRef(take);
  takeRef.current = take;

  useEffect(() => {
    if (!paste || disabled) return;
    const on = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
        .map((f) => new File([f], f.name === 'image.png' ? `screenshot-${Date.now()}.png` : f.name, { type: f.type }));
      if (files.length) { e.preventDefault(); takeRef.current(files); }
    };
    document.addEventListener('paste', on);
    return () => document.removeEventListener('paste', on);
  }, [paste, disabled]);

  const fileInput = <input ref={input} type="file" multiple hidden accept={accept.join(',')}
    onChange={(e) => { take([...(e.target.files ?? [])]); e.target.value = ''; }} />;
  const errorList = errors.length > 0 && <ul role="alert" className="text-sm font-medium text-bad">{errors.map((m) => <li key={m}>{m}</li>)}</ul>;
  return { take, open: () => input.current?.click(), fileInput, errorList };
}

/** Picked files with thumbnail, size, progress and remove. */
export function FileList({ items, onRemove }: { items: FileItem[]; onRemove?(id: string): void }) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <ul aria-label={t('fileDrop.attached')} className="flex flex-col gap-2">
      {items.map((it) => <Row key={it.id} it={it} onRemove={onRemove} />)}
    </ul>
  );
}

/**
 * Drag-drop / browse / paste-a-screenshot. UI only: valid files go to `onFiles`; the caller owns `items`
 * (with optional upload `progress` 0–100 and `error`) and removes them via `onRemove`.
 */
export function FileDrop({ onFiles, items = [], onRemove, accept = DEFAULT_ACCEPT, maxSizeMB = 10, maxFiles = 5, paste = true, disabled }: {
  onFiles(files: File[]): void; items?: FileItem[]; onRemove?(id: string): void; accept?: string[];
  maxSizeMB?: number; maxFiles?: number; paste?: boolean; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [over, setOver] = useState(false);
  const hint = useId();
  const intake = useFileIntake({ onFiles, count: items.length, accept, maxSizeMB, maxFiles, paste, disabled });
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (!disabled) intake.take([...e.dataTransfer.files]); };

  return (
    <div className="flex flex-col gap-3">
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
        className={`flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors
          ${over ? 'border-accent bg-accent-soft/60' : 'border-line-strong/50 bg-surface-2/40'} ${disabled ? 'opacity-60' : ''}`}>
        <ImagePlus aria-hidden size={24} className="text-ink-2" />
        <p className="text-[15px] text-ink">
          <button type="button" disabled={disabled} onClick={intake.open} aria-describedby={hint}
            className="font-semibold text-accent underline underline-offset-4 hover:no-underline">{t('fileDrop.browse')}</button>{' '}
          {t('fileDrop.orDrop')}
        </p>
        <p id={hint} className="text-sm text-muted">{t('fileDrop.hint', { max: maxSizeMB })}{paste && ` · ${t('fileDrop.paste')}`}</p>
        {intake.fileInput}
      </div>
      {intake.errorList}
      <FileList items={items} onRemove={onRemove} />
    </div>
  );
}

function Row({ it, onRemove }: { it: FileItem; onRemove?(id: string): void }) {
  const { t } = useTranslation();
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    if (!it.file.type.startsWith('image/') || typeof URL.createObjectURL !== 'function') return;
    const u = URL.createObjectURL(it.file);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [it.file]);
  const uploading = it.progress !== undefined && it.progress < 100 && !it.error;
  return (
    <li className={`flex items-center gap-3 rounded-sm border bg-surface p-2 pr-1 ${it.error ? 'border-bad/50' : 'border-line'}`}>
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-sm bg-surface-2 text-ink-2">
        {src ? <img src={src} alt="" className="size-full object-cover" /> : <FileText aria-hidden size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{it.file.name}</span>
        {it.error ? <span className="text-xs font-medium text-bad">{it.error}</span>
          : <span className="text-xs text-muted tnum">{size(it.file.size)}</span>}
        {uploading && (
          <span role="progressbar" aria-label={t('fileDrop.uploading', { name: it.file.name })} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(it.progress!)} className="mt-1 block h-1.5 overflow-hidden rounded-pill bg-surface-2">
            <span className="block h-full rounded-pill bg-accent transition-[width]" style={{ width: `${it.progress}%` }} />
          </span>
        )}
      </span>
      {onRemove && (
        <button type="button" onClick={() => onRemove(it.id)} aria-label={t('fileDrop.remove', { name: it.file.name })}
          className="grid size-11 shrink-0 place-items-center rounded-pill text-ink-2 hover:bg-surface-2 hover:text-ink">
          <X aria-hidden size={18} />
        </button>
      )}
    </li>
  );
}
