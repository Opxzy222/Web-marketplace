import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved || 'system';
  });

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const root = document.documentElement;

    // Apply/remove dark class on <html>
    root.classList.toggle('dark', isDark);

    // Manage theme-color meta (Android + general browsers)
    document
      .querySelectorAll('meta[name="theme-color"][data-dynamic="true"]')
      .forEach((el) => el.remove());

    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = isDark ? '#0f172a' : '#f8fafc';
    meta.setAttribute('data-dynamic', 'true');
    document.head.appendChild(meta);

    // iOS Safari / PWA status bar handling
    let appleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ) as HTMLMetaElement | null;

    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(appleMeta);
    }

    // black-translucent = transparent bar → overlay controls color
    // default = tries to use theme-color (but often ignored on iOS)
    appleMeta.content = isDark ? 'black-translucent' : 'default';

    let capableMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-capable"]'
    ) as HTMLMetaElement | null;

    if (!capableMeta) {
      capableMeta = document.createElement('meta');
      capableMeta.name = 'apple-mobile-web-app-capable';
      document.head.appendChild(capableMeta);
    }
    capableMeta.content = 'yes';

    // Persist user choice
    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [isDark, theme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = () => {
      // isDark changes → main effect runs
    };

    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};