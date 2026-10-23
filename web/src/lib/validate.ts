import i18n from '../i18n';

// Client mirrors server rules (lld-frontend §14). Each returns an error message or undefined.
const len = (v: string, min: number, max: number) => v.length >= min && v.length <= max;
const t = (k: string) => i18n.t(k);
export const normPhone = (v: string) => v.replace(/[\s().-]/g, '');
export const validate = {
  name: (v: string) => (len(v.trim(), 2, 80) ? undefined : t('validate.name')),
  email: (v: string) => (v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? undefined : t('validate.email')),
  password: (v: string) => (len(v, 8, 128) ? undefined : t('validate.password')),
  subject: (v: string) => (len(v.trim(), 5, 120) ? undefined : t('validate.subject')),
  /** Optional; E.164 once spaces, dashes, dots and brackets are removed (server normalises the same way). */
  phone: (v: string) => (v.trim() === '' || /^\+[1-9]\d{6,14}$/.test(normPhone(v)) ? undefined : t('validate.phone')),
  organization: (v: string) => (v.trim().length <= 120 ? undefined : t('validate.organization')),
  description: (v: string) => (len(v.trim(), 20, 5000) ? undefined : t('validate.description')),
};

/** Map server `details[]` onto fields (server wins on the same field). */
export function fieldErrors(details: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(details)) for (const d of details) if (d?.path && !out[d.path]) out[String(d.path)] = String(d.message);
  return out;
}

/** Only same-site absolute paths (`^/(?!/)`) — prevents open redirects. */
export const safeNext = (n: string | null) => (n && /^\/(?!\/)/.test(n) && !n.includes('\\') ? n : '/');
