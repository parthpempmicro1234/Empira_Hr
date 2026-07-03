import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'empira.theme';
const ACCENT_STORAGE_KEY = 'empira.accent';

export const THEMES = /** @type {const} */ (['dark', 'light']);
export const ACCENTS = /** @type {const} */ (['purple', 'blue', 'red', 'green', 'orange']);

const ThemeContext = createContext(null);

function safeReadStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function normalizeTheme(value) {
  return THEMES.includes(value) ? value : 'dark';
}

function normalizeAccent(value) {
  return ACCENTS.includes(value) ? value : 'purple';
}

function applyToDom({ theme, accent }) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = accent;
  // Tailwind `dark:` variants rely on the `dark` class.
  root.classList.toggle('dark', theme === 'dark');
}

/**
 * @param {{
 *  children: React.ReactNode,
 *  defaultTheme?: 'dark'|'light',
 *  defaultAccent?: 'purple'|'blue'|'red'|'green'|'orange'
 * }} props
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  defaultAccent = 'purple',
}) {
  const [theme, setTheme] = useState(() => {
    const stored = safeReadStorage(THEME_STORAGE_KEY);
    return normalizeTheme(stored ?? defaultTheme);
  });

  const [accent, setAccent] = useState(() => {
    const stored = safeReadStorage(ACCENT_STORAGE_KEY);
    return normalizeAccent(stored ?? defaultAccent);
  });

  useEffect(() => {
    applyToDom({ theme, accent });
    safeWriteStorage(THEME_STORAGE_KEY, theme);
    safeWriteStorage(ACCENT_STORAGE_KEY, accent);
  }, [theme, accent]);

  const value = useMemo(() => {
    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    const cycleAccent = () =>
      setAccent((a) => {
        const idx = ACCENTS.indexOf(a);
        const next = ACCENTS[(idx + 1) % ACCENTS.length];
        return next ?? 'purple';
      });

    return {
      theme,
      accent,
      setTheme: (t) => setTheme(normalizeTheme(t)),
      toggleTheme,
      setAccent: (a) => setAccent(normalizeAccent(a)),
      cycleAccent,
      themes: THEMES,
      accents: ACCENTS,
    };
  }, [theme, accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
