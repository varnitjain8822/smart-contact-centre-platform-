import mongoose from 'mongoose';
import { cfg } from './config.js';
import { createApp } from './app.js';
import { log } from './lib/log.js';
import * as hub from './realtime/hub.js';
import { KbArticle } from './models/KbArticle.js';
import { KbTranslation } from './models/KbTranslation.js';
import { upsertArticles } from './seed/kb.js';
import * as worker from './sync/worker.js';

let memory = null;
let url = cfg.MONGO_URL;
if (cfg.MONGO_MEMORY) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');   // dev only (devDependency)
  memory = await MongoMemoryServer.create();
  url = memory.getUri('smartcc');
}
// MONGO_URL may carry credentials (mongodb://user:pass@mongo:27017/smartcc?authSource=smartcc); never logged.
await mongoose.connect(url);
// startup index sync: creates new indexes and drops stale ones (needs createIndex + dropIndex on the db)
await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
log.info({ evt: 'indexes_synced', models: Object.keys(mongoose.models).length });
// seed when empty or when articles predate the Hindi translations
if ((await KbArticle.estimatedDocumentCount()) === 0 || (await KbTranslation.estimatedDocumentCount()) === 0) {
  log.info({ evt: 'kb_seeded', count: await upsertArticles() });
}

const server = createApp().listen(cfg.PORT, () => log.info({ evt: 'listening', port: cfg.PORT, mongoMemory: cfg.MONGO_MEMORY }));
worker.start();

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  log.info({ evt: 'shutdown', signal });
  worker.stop();
  const closed = new Promise((r) => server.close(r));   // stop accepting; in-flight requests finish
  hub.closeAll();                                       // SSE never ends on its own: end each stream with a reconnect hint
  server.closeIdleConnections?.();
  const forced = setTimeout(() => server.closeAllConnections?.(), cfg.SHUTDOWN_GRACE_MS);
  await closed;
  clearTimeout(forced);
  await mongoose.disconnect();
  await memory?.stop();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
