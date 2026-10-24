import i18n, { intlLocale } from '../i18n';
import type { Priority, Sla, Status, StatusEvent } from './types';

const MIN = 60_000;
const t = (k: string, o?: Record<string, unknown>) => i18n.t(k, o);

/** "2h 10m" / "12m" — whole minutes, floor. */
export function duration(ms: number) {
  const m = Math.floor(Math.abs(ms) / MIN);
  return m >= 60 ? t('time.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('time.m', { m });
}

/** lld-frontend §15a countdown text. */
export function countdown(ms: number) {
  if (ms < 0) return t('sla.breachedAgo', { d: duration(ms) });
  if (ms >= MIN) return t('sla.left', { d: duration(ms) });
  return t('sla.underMinute');
}

export type SlaTone = 'ok' | 'warn' | 'bad' | 'done';
export interface SlaView { tone: SlaTone; text: string; label: string; fraction: number }

const words = (ms: number) => {
  const m = Math.max(1, Math.floor(Math.abs(ms) / MIN));
  if (m < 60) return t('time.minutes', { count: m });
  const h = Math.floor(m / 60), r = m % 60;
  return t('time.hours', { count: h }) + (r ? ` ${t('time.minutes', { count: r })}` : '');
};

/** Derive chip tone/text/aria-label. `start` = ticket createdAt (SLA windows run from creation, REQ-024). */
export function slaView(sla: Sla, now: number, start: string): SlaView {
  const due = sla.activeDueAt ? Date.parse(sla.activeDueAt) : null;
  if (due === null) {
    const missed = sla.state === 'breached';
    return { tone: missed ? 'bad' : 'done', text: t(missed ? 'sla.missed' : 'sla.met'), fraction: missed ? 0 : 1,
      label: t(missed ? 'sla.labelMissed' : 'sla.labelMet') };
  }
  const left = due - now;
  const what = t(sla.firstResponseAt ? 'sla.resolution' : 'sla.firstResponse');
  const fraction = Math.min(1, Math.max(0, left / Math.max(1, due - Date.parse(start))));
  if (left < 0 || sla.state === 'breached')
    return { tone: 'bad', text: countdown(Math.min(left, -1)), fraction: 0, label: t('sla.labelBreached', { what, d: words(left) }) };
  if (sla.state === 'at_risk')
    return { tone: 'warn', text: t('sla.atRisk', { d: left < MIN ? t('sla.underMinuteShort') : duration(left) }), fraction,
      label: t('sla.labelAtRisk', { what, d: words(left) }) };
  return { tone: 'ok', text: countdown(left), fraction, label: t('sla.labelOnTrack', { what, d: words(left) }) };
}

export const statusLabel = (s: Status) => t(`status.${s}`);
export const priorityLabel = (p: Priority) => t(`priority.${p}`);
export const actorLabel = (a: StatusEvent['by']) => t(`actor.${a}`);
/** Category keys are per company (v4); labels come from the company, SmartCC's from i18n. */
export { categoryLabel } from './company';

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(), o);
export const time = (iso: string) => fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const fullDate = (iso: string) => fmt({ dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/** "Today" / "Yesterday" / "14 Oct" for day separators. */
export function dayLabel(iso: string, now = Date.now()) {
  const d = new Date(iso), n = new Date(now);
  const days = Math.round((new Date(n.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  return days === 0 ? t('time.today') : days === 1 ? t('time.yesterday') : fmt({ day: 'numeric', month: 'short' }).format(d);
}

/** "5 min ago" style for list meta. */
export function ago(iso: string, now = Date.now()) {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  const a = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });
  if (a < 60) return t('time.justNow');
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86_400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86_400), 'day');
}
