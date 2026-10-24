import { z } from 'zod';
import { CATEGORIES, PRIORITIES, TRIGGERS } from '../constants.js';

export const AiOutput = z.object({
  intent: z.string().max(40).catch('unknown'),
  category: z.enum(CATEGORIES).catch('General'),
  priority: z.enum(PRIORITIES).catch('medium'),
  confidence: z.coerce.number().transform((n) => Math.min(1, Math.max(0, n))),
  triggers: z.array(z.string()).catch([]).transform((a) => a.filter((t) => TRIGGERS.includes(t))),
  answer: z.string().catch('').transform((s) => s.slice(0, 1200)),
  sources: z.array(z.string()).catch([]),
  summary: z.string().catch('').transform((s) => s.slice(0, 300)),
});

/** v4: AiOutput with the company's category keys (unknown → the company's fallback category). */
export const aiOutputFor = (keys, fallback) => AiOutput.extend({ category: z.enum(keys).catch(fallback) });
