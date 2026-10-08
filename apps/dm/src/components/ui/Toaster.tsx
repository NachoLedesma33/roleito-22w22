import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/contexts/ThemeContext'

const LIGHT_THEMES = new Set<string>(['vitela'])

/** Toaster de Roleito: mapea el tema de UI a light/dark y usa tokens. */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={LIGHT_THEMES.has(theme) ? 'light' : 'dark'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast border-border bg-surface text-ink shadow-lg',
          description: 'text-ink-muted',
          actionButton: 'bg-brand text-on-brand',
          cancelButton: 'bg-surface-2 text-ink-muted',
        },
      }}
      {...props}
    />
  )
}