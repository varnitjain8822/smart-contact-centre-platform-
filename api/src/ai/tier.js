/** @returns {{tier:'auto'|'draft'|'human', reason:string}} */
export function decideTier({ failed, triggers, priority, autoCount, confidence, validSources, answer }, cfg) {
  if (failed) return { tier: 'human', reason: 'ai_unavailable' };
  if (triggers.length) return { tier: 'human', reason: `triggers:${triggers.join(',')}` };
  if (priority === 'critical') return { tier: 'human', reason: 'critical_priority' };
  if (autoCount >= cfg.AI_MAX_AUTO_REPLIES) return { tier: 'human', reason: 'auto_limit' };
  const hasAnswer = answer.trim().length > 0;
  if (confidence > cfg.AI_AUTO_THRESHOLD && validSources.length > 0 && hasAnswer) return { tier: 'auto', reason: 'high_confidence' };
  if (confidence >= cfg.AI_DRAFT_THRESHOLD && hasAnswer) return { tier: 'draft', reason: 'medium_confidence' };
  return { tier: 'human', reason: 'low_confidence' };
}
