// v4 multi-company portal (lld-frontend §v4): the company of this page load, fixed at boot from `/c/<slug>/…`.
import i18n from '../i18n';

export interface CompanyCategory { key: string; label: string; labelHi: string }
export interface Company {
  slug: string; name: string; sector: string; tagline: string; primaryColor: string; accentColor: string;
  logoText: string; supportHours: string; demo: boolean; categories: CompanyCategory[];
}

const SMARTCC_KEYS = ['Account', 'Billing', 'Technical', 'Commerce & Trade', 'Compliance & GST', 'Logistics & Orders', 'General'];
/** The original single-company portal; also what tests and pre-boot code see. Labels come from i18n `category.*`. */
export const DEFAULT_COMPANY: Company = {
  slug: 'smartcc', name: 'SmartCC', sector: '', tagline: '', primaryColor: '#3D35C8', accentColor: '#6D28D9', logoText: 'SmartCC',
  supportHours: '', demo: false, categories: SMARTCC_KEYS.map((key) => ({ key, label: '', labelHi: '' })),
};

let current: Company = DEFAULT_COMPANY;
let given = false;   // false = no /c/<slug> in the URL (tests, old links): requests carry no X-Company
export const company = () => current;
export const companyGiven = () => given;
export function setCompany(c: Company) {
  current = c; given = true;
  i18n.options.interpolation!.defaultVariables = { ...i18n.options.interpolation?.defaultVariables, brand: c.logoText || c.name };
}

/** `/c/sbi/tickets` → 'sbi'; anything else → null. */
export const slugFromPath = (path: string) => path.match(/^\/c\/([a-z0-9-]{2,40})(?:\/|$)/)?.[1] ?? null;
export const basenameFor = (slug: string) => `/c/${slug}`;

export const categoryKeys = () => current.categories.map((c) => c.key);
/** Company label in the UI language; the default company's labels are the i18n `category.*` strings. */
export function categoryLabel(key: string) {
  const c = current.categories.find((x) => x.key === key);
  const own = i18n.language === 'hi' ? c?.labelHi || c?.label : c?.label;
  return own || i18n.t(`category.${key}`, { defaultValue: key });
}
/** Tests: back to "no company in the URL". */
export function resetCompany() { setCompany(DEFAULT_COMPANY); given = false; }
