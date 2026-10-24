/** @returns {{tier:'auto'|'draft'|'human', reason:string}} */
export function decideTier({ failed, triggers, priority, autoCount, confidence, validSources, answer, usedRecords = false }, cfg) {
  if (failed) return { tier: 'human', reason: 'ai_unavailable' };
  if (triggers.length) return { tier: 'human', reason: `triggers:${triggers.join(',')}` };
  if (priority === 'critical') return { tier: 'human', reason: 'critical_priority' };
  if (autoCount >= cfg.AI_MAX_AUTO_REPLIES) return { tier: 'human', reason: 'auto_limit' };
  const hasAnswer = answer.trim().length > 0;
  // v4: an answer from the customer's own records (tool lookup) needs no KB source
  if (confidence > cfg.AI_AUTO_THRESHOLD && (validSources.length > 0 || usedRecords) && hasAnswer) return { tier: 'auto', reason: 'high_confidence' };
  if (confidence >= cfg.AI_DRAFT_THRESHOLD && hasAnswer) return { tier: 'draft', reason: 'medium_confidence' };
  return { tier: 'human', reason: 'low_confidence' };
}
