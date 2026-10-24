import { cfg } from '../config.js';

export const TARGETS = { critical: { response: 15, resolution: 120 }, high: { response: 60, resolution: 240 },
  medium: { response: 240, resolution: 720 }, low: { response: 1440, resolution: 2880 } };   // minutes
const addMin = (d, m) => new Date(new Date(d).getTime() + m * 60000);

/** override = company.slaOverride {critical,high,medium,low} first-response minutes (v4); resolution targets stay. */
export const dueDates = (createdAt, p, override = null) => ({ responseDueAt: addMin(createdAt, override?.[p] ?? TARGETS[p].response),
  resolutionDueAt: addMin(createdAt, Math.max(TARGETS[p].resolution, override?.[p] ?? 0)) });
export const activeDue = (t) => (t.sla.firstResponseAt ? t.sla.resolutionDueAt : t.sla.responseDueAt);

export function state(t, now = new Date(), ratio = cfg.SLA_AT_RISK_RATIO) {
  if (t.status === 'resolved') {
    const fr = t.sla.firstResponseAt ?? t.resolvedAt;
    return t.resolvedAt <= t.sla.resolutionDueAt && fr <= t.sla.responseDueAt ? 'met' : 'breached';
  }
  if (t.sla.firstResponseAt && t.sla.firstResponseAt > t.sla.responseDueAt) return 'breached';
  const due = activeDue(t); if (now > due) return 'breached';
  return (due - now) / (due - t.createdAt) <= ratio ? 'at_risk' : 'on_track';
}
