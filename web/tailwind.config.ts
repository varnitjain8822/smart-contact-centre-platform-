import type { Config } from 'tailwindcss';

const tokens = ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'muted', 'line', 'line-strong', 'accent', 'on-accent',
  'accent-soft', 'ai', 'ai-soft', 'ok', 'warn', 'bad', 'info', 'focus'] as const;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(tokens.map((t) => [t, `rgb(var(--${t}) / <alpha-value>)`])),
      fontFamily: { display: 'var(--font-display)', text: 'var(--font-text)' },
      fontSize: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '22px', '2xl': '28px', '3xl': '36px' },
      borderRadius: { sm: 'var(--r-sm)', md: 'var(--r-md)', pill: 'var(--r-pill)' },
      boxShadow: { card: 'var(--shadow)', pop: 'var(--shadow-pop)' },
      transitionDuration: { DEFAULT: '180ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(.2,.7,.2,1)' },
      screens: { md: '768px', xl: '1280px' },
    },
  },
} satisfies Config;
