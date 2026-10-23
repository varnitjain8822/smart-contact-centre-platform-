import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'scc-theme';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch { return 'system'; }
}

const Ctx = createContext<{ pref: ThemePref; setPref(p: ThemePref): void }>({ pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(read);
  useEffect(() => {
    const m = mq();
    const apply = () => { document.documentElement.dataset.theme = pref === 'system' ? (m.matches ? 'dark' : 'light') : pref; };
    apply();
    if (pref !== 'system') return;
    m.addEventListener('change', apply);
    return () => m.removeEventListener('change', apply);
  }, [pref]);
  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try { p === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, p); } catch { /* private mode */ }
  };
  return <Ctx.Provider value={{ pref, setPref }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
export const NEXT_THEME: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
