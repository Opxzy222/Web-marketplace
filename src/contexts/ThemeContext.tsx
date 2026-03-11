// src/contexts/ThemeContext.tsx  (or wherever your ThemeProvider lives)
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved || 'system';
  });

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    // Persist immediately (helps with reload consistency)
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  useEffect(() => {
    const root = document.documentElement;

    // Apply dark class
    const shouldBeDark = isDark;
    root.classList.toggle('dark', shouldBeDark);

    // ────────────────────────────────────────────────
    // Force Safari/iOS full repaint & style recalculation
    // This is the key fix for your issue
    // ────────────────────────────────────────────────
    // Method: Temporarily hide → force reflow → restore
    const originalDisplay = root.style.display;
    root.style.display = 'none';

    // Reading offsetHeight (or scrollTop, clientHeight etc.) forces layout
    void root.offsetHeight; // eslint-disable-line no-unused-expressions

    root.style.display = originalDisplay || '';

    // Alternative lighter version (uncomment if the above feels too aggressive):
    // root.style.zoom = '1.00001';
    // setTimeout(() => { root.style.zoom = '1'; }, 0);

    // ────────────────────────────────────────────────
    // Your existing dynamic meta theme-color logic
    // ────────────────────────────────────────────────
    document
      .querySelectorAll('meta[name="theme-color"][data-dynamic="true"]')
      .forEach((el) => el.remove());

    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = shouldBeDark ? '#0f172a' : '#f8fafc';
    meta.setAttribute('data-dynamic', 'true');
    document.head.appendChild(meta);

    // iOS status bar style
    let appleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ) as HTMLMetaElement | null;

    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(appleMeta);
    }

    appleMeta.content = shouldBeDark ? 'black-translucent' : 'default';

    // Ensure capable meta exists
    let capableMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-capable"]'
    ) as HTMLMetaElement | null;

    if (!capableMeta) {
      capableMeta = document.createElement('meta');
      capableMeta.name = 'apple-mobile-web-app-capable';
      document.head.appendChild(capableMeta);
    }
    capableMeta.content = 'yes';

  }, [isDark, theme]); // Depend on both — runs when either changes

  // System preference listener (only when theme = 'system')
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // isDark will update → main effect will run + force repaint
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
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