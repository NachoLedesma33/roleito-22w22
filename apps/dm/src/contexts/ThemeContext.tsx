import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Temas de UI. El tema escribe `data-theme` en <html> y aplica los tokens
 * definidos en `index.css`. La preferencia es de UI, no de campaña.
 */
export type Theme = 'nocturno' | 'vitela' | 'brasa' | 'abisal' | 'alto-contraste' | 'daltonico'

export const THEMES: ReadonlyArray<{ id: Theme; label: string }> = [
  { id: 'nocturno', label: 'Nocturno' },
  { id: 'vitela', label: 'Vitela' },
  { id: 'brasa', label: 'Brasa' },
  { id: 'abisal', label: 'Abisal' },
  { id: 'alto-contraste', label: 'Alto contraste' },
  { id: 'daltonico', label: 'Daltónico' },
]

const STORAGE_KEY = 'roleito:theme'

function isTheme(value: string): value is Theme {
  return THEMES.some((t) => t.id === value)
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && isTheme(raw)) return raw
  } catch {
    /* localStorage no disponible */
  }
  return 'nocturno'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* localStorage no disponible */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}