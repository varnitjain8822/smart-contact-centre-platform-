import { cfg } from '../config.js';
import { log } from '../lib/log.js';

// Local multilingual sentence embeddings (no API key). Loaded on first use; the model files (~120 MB, q8) are cached
// in EMBED_CACHE_DIR (a docker volume) after the first download. A failed load is retried after 5 min.
let ready = null;
const load = () => (ready ??= import('@huggingface/transformers').then(({ pipeline, env }) => {
  if (cfg.EMBED_CACHE_DIR) env.cacheDir = cfg.EMBED_CACHE_DIR;
  return pipeline('feature-extraction', cfg.EMBED_MODEL, { dtype: 'q8' });
}).catch((e) => {
  log.warn({ evt: 'embed_model_unavailable', err: e.message });
  setTimeout(() => { ready = null; }, 300_000).unref();
  throw e;
}));

export const model = cfg.EMBED_MODEL;

/** texts → unit vectors. kind 'query' | 'passage' (e5 models are trained with these prefixes). */
export async function embed(texts, kind) {
  const ex = await load();
  const out = [];
  for (let i = 0; i < texts.length; i += 16) {
    const t = await ex(texts.slice(i, i + 16).map((s) => `${kind}: ${s}`), { pooling: 'mean', normalize: true });
    out.push(...t.tolist());
  }
  return out;
}
