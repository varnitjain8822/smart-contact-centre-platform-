import { log } from '../lib/log.js';

const chains = new Map();
export function enqueue(key, fn) {
  const next = (chains.get(key) ?? Promise.resolve()).then(fn).catch((e) => log.error({ evt: 'bot_error', key, err: e.message }))
    .finally(() => { if (chains.get(key) === next) chains.delete(key); });
  chains.set(key, next); return next;
}
export const pending = () => chains.size;
