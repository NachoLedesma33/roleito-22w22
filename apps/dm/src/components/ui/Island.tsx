import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface IslandItem {
  id: string
  label: string
  icon?: ReactNode
  hint?: string
}

export interface IslandProps {
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
  title: string
  items: ReadonlyArray<IslandItem>
  className?: string
}

/**
 * Isla: overlay de navegacion zoom-out con mosaico de tiles.
 * Teclado (flechas + Enter), busqueda interna, Esc cierra.
 */
export function Island({ open, onClose, onSelect, title, items, className }: IslandProps) {
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.label.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (filtered.length === 0) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((a) => (a + 1) % filtered.length)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((a) => (a - 1 + filtered.length) % filtered.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = filtered[active]
      if (item) onSelect(item.id)
    }
  }

  const fade = { duration: reduce ? 0 : 0.2 }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="island"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          onKeyDown={handleKeyDown}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          className={cn('fixed inset-0 z-50 flex flex-col bg-bg/80 backdrop-blur-sm', className)}
        >
          <header className="flex items-center gap-3 border-b border-border p-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              ← <span className="font-semibold text-ink">{title}</span>
            </button>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              placeholder="Buscar…"
              aria-label="Buscar"
              className="ml-auto w-full max-w-xs rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </header>

          <motion.div
            initial={reduce ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.98, opacity: 0 }}
            transition={fade}
            className="grid grid-cols-2 gap-3 overflow-auto p-6 sm:grid-cols-3 md:grid-cols-4"
          >
            {filtered.length === 0 ? (
              <p className="col-span-full text-sm text-ink-muted">Sin resultados.</p>
            ) : (
              filtered.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  onMouseEnter={() => setActive(index)}
                  aria-current={index === active}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-4 text-left text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none',
                    index === active && 'ring-2 ring-ring',
                  )}
                >
                  {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                  <span className="font-medium">{item.label}</span>
                  {item.hint ? <span className="text-xs text-ink-muted">{item.hint}</span> : null}
                </button>
              ))
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}