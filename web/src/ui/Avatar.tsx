const TONES = ['bg-accent-soft text-accent', 'bg-ai-soft text-ai', 'bg-ok/15 text-ok', 'bg-info/15 text-info', 'bg-warn/15 text-warn'];
const SIZE = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' };

export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0] ?? '').join('').toUpperCase() || '?';

/** Same name → same colour. */
const tone = (name: string) => TONES[[...name].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7) % TONES.length];

/** Initials (or image) in a circle. Decorative unless `label` is given. */
export function Avatar({ name, src, size = 'md', label }: { name: string; src?: string; size?: keyof typeof SIZE; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <span {...a11y} className={`inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full font-display font-semibold ${SIZE[size]} ${tone(name)}`}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
