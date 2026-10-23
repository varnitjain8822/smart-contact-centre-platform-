import { useEffect, useRef, useState } from 'react';
import { ApiError, upload } from '../../lib/api';
import type { Attachment } from '../../lib/types';
import type { FileItem } from '../../ui/FileDrop';
import i18n from '../../i18n';

export type Upload = FileItem & { attachment?: Attachment };

const reason = (e: unknown) => {
  const code = e instanceof ApiError ? e.code : '';
  if (code === 'FILE_TOO_LARGE') return i18n.t('upload.tooLarge');
  if (code === 'UNSUPPORTED_FILE_TYPE') return i18n.t('upload.badType');
  if (code === 'RATE_LIMITED') return i18n.t('common.rateLimited');
  return i18n.t('upload.failed');
};

/** Uploads each file as soon as it is picked (XHR progress). `ticket` null = before the ticket exists. */
export function useUploads(ticket: string | null) {
  const [items, setItems] = useState<Upload[]>([]);
  const ctl = useRef(new Map<string, AbortController>());
  const patch = (id: string, p: Partial<Upload>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));

  useEffect(() => () => ctl.current.forEach((c) => c.abort()), []);

  const add = (files: File[]) => {
    const next = files.map((file) => ({ id: crypto.randomUUID(), file, progress: 0 }));
    setItems((l) => [...l, ...next]);
    for (const it of next) {
      const c = new AbortController();
      ctl.current.set(it.id, c);
      upload(it.file, ticket, (progress) => patch(it.id, { progress: Math.min(progress, 99) }), c.signal)
        .then((attachment) => patch(it.id, { progress: 100, attachment }),
          (e) => { if (!c.signal.aborted) patch(it.id, { error: reason(e) }); })
        .finally(() => ctl.current.delete(it.id));
    }
  };
  const remove = (id: string) => { ctl.current.get(id)?.abort(); setItems((l) => l.filter((x) => x.id !== id)); };
  const done = items.flatMap((x) => (x.attachment ? [x.attachment] : []));
  const busy = items.some((x) => !x.attachment && !x.error);
  return { items, add, remove, done, busy, reset: () => setItems([]) };
}
