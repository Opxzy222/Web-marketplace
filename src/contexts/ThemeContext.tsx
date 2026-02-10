// src/contexts/ThemeContext.tsx

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

  // Update <html> class + theme-color meta
  useEffect(() => {
    const root = document.documentElement;

    // Apply/remove dark class
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // ────────────── Manage status bar / address bar color ──────────────
    // Remove any previously added dynamic theme-color meta tags
    document
      .querySelectorAll('meta[name="theme-color"][data-dynamic="true"]')
      .forEach((el) => el.remove());

    // Create and append new meta tag
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#2F5F87';                    // ← same color for both modes
    meta.setAttribute('data-dynamic', 'true');   // marker to identify our tags
    document.head.appendChild(meta);
    // ────────────────────────────────────────────────────────────────

    // Optional: reinforce apple-mobile-web-app-status-bar-style (helps iOS PWA)
    let appleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleMeta);
    }
    appleMeta.setAttribute('content', 'black-translucent');

    // Persist only when user made explicit choice
    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [isDark, theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = () => {
      // classList will be updated by the first useEffect because isDark changes
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