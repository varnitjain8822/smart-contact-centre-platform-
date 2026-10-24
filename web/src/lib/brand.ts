// Company branding as CSS token overrides (tokens.css holds RGB triplets). Colours are nudged until WCAG AA holds:
// light: accent vs white text and vs the page background ≥ 4.5; dark: accent vs dark surface ≥ 4.5 (dark text on accent buttons).
type RGB = [number, number, number];

export const hexToRgb = (h: string): RGB => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function contrast(a: RGB, b: RGB) { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); }
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i]! - v) * t)) as RGB;

const WHITE: RGB = [255, 255, 255], BLACK: RGB = [0, 0, 0];
const LIGHT_BG: RGB = [246, 244, 238], DARK_SURFACE: RGB = [21, 24, 33], DARK_BG: RGB = [13, 15, 21];

/** Darken (towards black) or lighten (towards white) in 5 % steps until every `against` colour has ≥ min contrast. */
export function ensureContrast(c: RGB, against: RGB[], toward: RGB, min = 4.5): RGB {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const x = mix(c, toward, t);
    if (against.every((a) => contrast(x, a) >= min)) return x;
  }
  return toward;
}

const triplet = (c: RGB) => c.join(' ');

/** CSS for the company: light + dark accent tokens, accent-soft tints, and the ribbon colours. */
export function brandCss(primary: string, accent: string) {
  const p = hexToRgb(primary), a = hexToRgb(accent);
  const light = ensureContrast(p, [WHITE, LIGHT_BG], BLACK);
  const dark = ensureContrast(p, [DARK_SURFACE, DARK_BG], WHITE);
  const ribbonBg = a;
  const ribbonInk = contrast(a, WHITE) >= contrast(a, BLACK) ? WHITE : BLACK;
  const ribbonBgSafe = contrast(ribbonBg, ribbonInk) >= 4.5 ? ribbonBg : ensureContrast(ribbonBg, [ribbonInk], ribbonInk === WHITE ? BLACK : WHITE);
  return `:root,[data-theme='light']{--accent:${triplet(light)};--focus:var(--accent);--accent-soft:${triplet(mix(light, WHITE, 0.88))};` +
    `--brand-ribbon:${triplet(ribbonBgSafe)};--brand-ribbon-ink:${triplet(ribbonInk)}}` +
    `[data-theme='dark']{--accent:${triplet(dark)};--focus:var(--accent);--accent-soft:${triplet(mix(dark, DARK_BG, 0.78))};` +
    `--brand-ribbon:${triplet(ribbonBgSafe)};--brand-ribbon-ink:${triplet(ribbonInk)}}`;
}

export function applyBrand(primary: string, accent: string) {
  let el = document.getElementById('company-brand');
  if (!el) { el = document.createElement('style'); el.id = 'company-brand'; document.head.appendChild(el); }
  el.textContent = brandCss(primary, accent);
}
