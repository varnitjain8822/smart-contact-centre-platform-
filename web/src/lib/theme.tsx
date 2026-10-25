import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type ThemePref = 'light';

const Ctx = createContext<{ pref: ThemePref; setPref(p: ThemePref): void }>({ pref: 'light', setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem('scc-theme', 'light');
    } catch {
      // ignore
    }
  }, []);

  return <Ctx.Provider value={{ pref: 'light', setPref: () => {} }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
export const NEXT_THEME: Record<string, string> = { light: 'light' };
