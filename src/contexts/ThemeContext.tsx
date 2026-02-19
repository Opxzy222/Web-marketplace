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

  // Update <html> class + theme-color meta + iOS status bar style
  useEffect(() => {
    const root = document.documentElement;

    // Apply/remove dark class on <html>
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // ────────────────────────────────────────────────────────────────
    // Manage theme-color meta (Android + general browsers) – dynamic for app mode
    // ────────────────────────────────────────────────────────────────
    // Remove any previously added dynamic theme-color tags
    document
      .querySelectorAll('meta[name="theme-color"][data-dynamic="true"]')
      .forEach((el) => el.remove());

    // Create and append new meta tag with color based on isDark
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = isDark ? '#0f172a' : '#f8fafc';  // ← Dynamic based on mode
    meta.setAttribute('data-dynamic', 'true');      // Marker so we can clean up later
    document.head.appendChild(meta);

    // ────────────────────────────────────────────────────────────────
    // iOS Safari / PWA status bar handling
    // ────────────────────────────────────────────────────────────────
    let appleMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ) as HTMLMetaElement | null;

    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleMeta);
    }

    // Use "default" so iOS respects the theme-color
    appleMeta.setAttribute('content', 'default');

    // Optional: reinforce full-screen PWA capability (helps on iOS)
    let capableMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-capable"]'
    ) as HTMLMetaElement | null;

    if (!capableMeta) {
      capableMeta = document.createElement('meta');
      capableMeta.setAttribute('name', 'apple-mobile-web-app-capable');
      document.head.appendChild(capableMeta);
    }
    capableMeta.setAttribute('content', 'yes');

    // ────────────────────────────────────────────────────────────────
    // Persist user choice (only if not 'system')
    // ────────────────────────────────────────────────────────────────
    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [isDark, theme]);

  // Listen for system theme changes (only when theme = 'system')
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = () => {
      // The classList + meta updates will happen automatically via the first useEffect
      // because isDark changes when system preference changes
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