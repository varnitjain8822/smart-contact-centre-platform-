import { PRIORITIES } from '../constants.js';

// lists copied from reference AUTO_ESCALATION_RULES
export const KEYWORDS = {
  fraud: ['fraud', 'scam', 'phishing', 'stolen card', 'forged', 'fraudulent'],
  security: ['security', 'breach', 'data leak', 'vulnerability', 'exposed', 'cyber', 'malware'],
  legal: ['legal', 'lawsuit', 'lawyer', 'attorney', 'court', 'consumer forum', 'sue', 'legal action'],
  angry_customer: ['unacceptable', 'furious', 'angry', 'terrible', 'worst', 'disgusted', 'ridiculous', 'no one is helping', 'pathetic'],
  payment_dispute: ['chargeback', 'dispute', 'payment dispute', 'charged twice', 'double charged', 'unauthorized charge', 'unauthorized transaction', 'wrong deduction'],
  account_takeover: ['hacked', 'account takeover', 'compromised', 'unauthorized access', 'someone else logged in', 'stolen account'],
  repeated_issue: ['multiple times', 'still not fixed', 'third time', 'again and again', 'repeated', 'still unresolved', 'contacted you before'],
  critical_incident: ['production down', 'down for everyone', 'emergency', 'system outage', 'data loss', 'lost my data', 'stuck at customs', 'losing money'],
};

export function scanKeywords(text) {          // word-boundary, case-insensitive
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
  return Object.entries(KEYWORDS).filter(([, ws]) => ws.some((w) => t.includes(` ${w} `))).map(([k]) => k);
}
const CRITICAL_FLOOR = new Set(['fraud', 'account_takeover', 'security', 'critical_incident']);
export const priorityFloor = (triggers) => (triggers.some((t) => CRITICAL_FLOOR.has(t)) ? 'critical' : triggers.length ? 'high' : 'low');
export const maxPriority = (a, b) => PRIORITIES[Math.max(PRIORITIES.indexOf(a), PRIORITIES.indexOf(b))];
