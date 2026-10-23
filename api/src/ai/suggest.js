import { cfg } from '../config.js';
import { deps } from '../deps.js';
import { topArticles } from '../kb/retrieve.js';
import { log } from '../lib/log.js';
import { toKbSummary } from '../tickets/dto.js';
import { buildMessages } from './prompt.js';
import { AiOutput } from './schema.js';
import { scanKeywords } from './triggers.js';

export async function suggest(userId, { subject, description }, locale = 'en') {
  const text = `${subject} ${description}`.trim();
  const articles = await topArticles(text, 3, locale);
  let out = null;
  try {
    out = AiOutput.parse(await deps.groq.complete(buildMessages('suggestion', { subject, locale }, articles, [{ author: 'customer', body: description }])));
  } catch (e) {
    log.warn({ evt: 'suggest_ai_failed', err: e.code ?? e.message });
  }
  const allowed = new Set(articles.map((a) => a.slug));
  const validSources = [...new Set((out?.sources ?? []).filter((s) => allowed.has(s)))];
  const triggers = [...(out?.triggers ?? []), ...scanKeywords(text)];
  const show = !!out && out.confidence >= cfg.AI_DRAFT_THRESHOLD && !triggers.length && validSources.length > 0 && !!out.answer.trim();
  log.info({ evt: 'suggestion_shown', userId: String(userId), confidence: out?.confidence ?? null, sourceCount: show ? validSources.length : 0 });
  return {
    answer: show ? out.answer : null,
    confidence: out?.confidence ?? null,
    sources: show ? validSources.map((s) => ({ slug: s, title: articles.find((a) => a.slug === s).title })) : [],
    articles: articles.map(toKbSummary),
  };
}
