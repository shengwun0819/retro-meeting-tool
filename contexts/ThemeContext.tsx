'use client'

import { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
})

/**
 * Source of truth for the theme is the `dark` class on <html>, which is set
 * before hydration by the inline script in app/layout.tsx (reads localStorage
 * / prefers-color-scheme). React subscribes to it via MutationObserver so
 * `theme` always reflects the live DOM state — no useEffect setState, no
 * hydration mismatch.
 */

const subscribe = (notify: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const getSnapshot = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'

// SSR / first paint: always 'light'. The inline script will have applied the real
// theme to <html> before hydration, so the next snapshot read will be correct.
const getServerSnapshot = (): Theme => 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleTheme = useCallback(() => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    localStorage.setItem('retro-theme', next)
    if (next === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    // MutationObserver in subscribe() picks up the class change and re-renders.
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
