import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, X } from 'lucide-react';
import type { Attachment } from '../../lib/types';

export const fileSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const isImage = (a: Attachment) => /^image\/(png|jpeg|webp|gif)$/.test(a.mime);

/** Thumbnails (open a lightbox) for images, download chips for everything else. */
export function Attachments({ items, align = 'start' }: { items: Attachment[]; align?: 'start' | 'end' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Attachment | null>(null);
  if (!items.length) return null;
  const images = items.filter(isImage), files = items.filter((a) => !isImage(a));
  return (
    <div className={`mt-2 flex max-w-[88%] flex-col gap-2 md:max-w-[75%] ${align === 'end' ? 'items-end' : 'items-start'}`}>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('attach.images')}>
          {images.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setOpen(a)} aria-label={t('attach.view', { name: a.name })}
                className="block overflow-hidden rounded-sm border border-line bg-surface-2 transition-opacity hover:opacity-90 print:hidden">
                <img src={a.url} alt="" loading="lazy" className="size-28 object-cover sm:size-32" />
              </button>
              <span className="hidden text-sm print:inline">{a.name}</span>
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('attach.files')}>
          {files.map((a) => (
            <li key={a.id} className="min-w-0 max-w-full">
              <a href={a.url} download={a.name}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm transition-colors hover:border-line-strong">
                <FileText aria-hidden size={17} className="shrink-0 text-ink-2" />
                <span className="truncate font-semibold text-ink">{a.name}</span>
                <span className="shrink-0 text-xs text-muted tnum">{fileSize(a.size)}</span>
                <Download aria-hidden size={15} className="shrink-0 text-muted" />
                <span className="sr-only">{t('attach.download')}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {open && <Lightbox a={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Lightbox({ a, onClose }: { a: Attachment; onClose(): void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    d?.showModal();
    return () => opener?.focus();
  }, []);
  return (
    <dialog ref={ref} aria-label={a.name} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto max-h-[94dvh] max-w-[96vw] overflow-visible bg-transparent p-0 backdrop:bg-ink/80 backdrop:backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <img src={a.url} alt={a.name} className="max-h-[80dvh] max-w-[94vw] rounded-sm object-contain shadow-pop" />
        <div className="flex items-center gap-2 rounded-pill bg-ink/90 py-1 pl-4 pr-1 text-sm font-medium text-bg">
          <span className="max-w-[50vw] truncate">{a.name}</span>
          <a href={a.url} download={a.name} aria-label={t('attach.download')} className="grid size-11 place-items-center rounded-pill hover:bg-bg/15"><Download aria-hidden size={18} /></a>
          <button type="button" onClick={onClose} aria-label={t('attach.close')} autoFocus className="grid size-11 place-items-center rounded-pill hover:bg-bg/15"><X aria-hidden size={19} /></button>
        </div>
      </div>
    </dialog>
  );
}
