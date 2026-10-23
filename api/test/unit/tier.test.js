import { expect, test } from 'vitest';
import { decideTier } from '../../src/ai/tier.js';

const cfg = { AI_AUTO_THRESHOLD: 0.85, AI_DRAFT_THRESHOLD: 0.6, AI_MAX_AUTO_REPLIES: 2 };
const base = { failed: false, triggers: [], priority: 'medium', autoCount: 0, confidence: 0.9, validSources: ['a'], answer: 'Do X' };

test.each([
  ['failed', { failed: true }, 'human', 'ai_unavailable'],
  ['trigger at 0.99', { triggers: ['fraud'], confidence: 0.99 }, 'human', 'triggers:fraud'],
  ['critical', { priority: 'critical' }, 'human', 'critical_priority'],
  ['autoCount 2', { autoCount: 2 }, 'human', 'auto_limit'],
  ['0.86 + source + answer', { confidence: 0.86 }, 'auto', 'high_confidence'],
  ['0.86 no source', { confidence: 0.86, validSources: [] }, 'draft', 'medium_confidence'],
  ['0.85 exactly', { confidence: 0.85 }, 'draft', 'medium_confidence'],
  ['0.60', { confidence: 0.6 }, 'draft', 'medium_confidence'],
  ['0.59', { confidence: 0.59 }, 'human', 'low_confidence'],
  ['empty answer 0.9', { answer: '  ' }, 'human', 'low_confidence'],
])('%s', (_, o, tier, reason) => expect(decideTier({ ...base, ...o }, cfg)).toEqual({ tier, reason }));
