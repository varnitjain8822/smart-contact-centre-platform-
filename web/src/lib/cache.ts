import type { Message, UiMessage } from './types';

/** Insert or replace by id / clientMessageId, keeping createdAt order (lld-frontend §12). */
export function upsertMessage(list: UiMessage[] = [], m: Message): UiMessage[] {
  const i = list.findIndex((x) => x.id === m.id || (m.clientMessageId && x.clientMessageId === m.clientMessageId));
  if (i === -1) return [...list, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const copy = list.slice();
  copy[i] = m;
  return copy;
}
