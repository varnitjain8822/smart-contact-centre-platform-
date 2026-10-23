const clients = new Map(); // userId -> Set<res>
export const add = (uid, res) => (clients.get(uid) ?? clients.set(uid, new Set()).get(uid)).add(res);
export const remove = (uid, res) => { const s = clients.get(uid); s?.delete(res); if (s && !s.size) clients.delete(uid); };
export const emit = (uid, event, data) => {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.get(String(uid)) ?? []) res.write(frame);
};
export const count = (uid) => clients.get(String(uid))?.size ?? 0;
setInterval(() => { for (const s of clients.values()) for (const r of s) r.write(': ping\n\n'); }, 25000).unref();
/** End one user's streams (sessions revoked); each EventSource reconnects and is re-authenticated. */
export const endAll = (uid) => { for (const r of clients.get(String(uid)) ?? []) r.end(); clients.delete(String(uid)); };
/** Graceful shutdown: tell every client to reconnect soon (to the next instance) and end the stream. */
export const closeAll = () => {
  for (const s of clients.values()) for (const r of s) { r.write('event: shutdown\ndata: {}\n\nretry: 1000\n\n'); r.end(); }
  clients.clear();
};
