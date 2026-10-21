import { useEffect, useRef } from 'react'
import type { SceneItem, WallMetadata } from '@core/domain/types'

interface WallContextMenuProps {
  x: number
  y: number
  item: SceneItem
  onUpdate: (patch: Partial<SceneItem>) => void
  onDelete: () => void
  onClose: () => void
}

/**
 * Edicion de un muro (manual o propuesto por la deteccion).
 *
 * Esto es el "Modo Hibrido" del doc: la IA hace una primera pasada y el DM
 * afina lo que le sirve. Los flags `lineOfSight`, `movement` y `opacity` ya
 * existen en el metadata; antes no los leia nadie, asi que editarlos no hacia
 * nada.
 */
export default function WallContextMenu({
  x,
  y,
  item,
  onUpdate,
  onDelete,
  onClose,
}: WallContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const meta = item.metadata as WallMetadata

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const setFlag = (key: 'lineOfSight' | 'movement', value: boolean) => {
    onUpdate({ metadata: { ...meta, [key]: value } })
  }

  const inputClass =
    'w-full bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)] rounded px-2 py-1 text-xs text-[var(--text-primary)]'

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-900 border border-gray-600 rounded shadow-lg p-2 min-w-[220px] space-y-2"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={item.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Nombre del muro"
        aria-label="Nombre del muro"
        className={inputClass}
      />

      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={meta.lineOfSight !== false}
          onChange={(e) => setFlag('lineOfSight', e.target.checked)}
        />
        Tapa la vista
      </label>

      <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={meta.movement !== false}
          onChange={(e) => setFlag('movement', e.target.checked)}
        />
        Bloquea el movimiento
      </label>

      <label className="block text-xs text-[var(--text-secondary)]">
        Opacidad: {Math.round((meta.opacity ?? 0.12) * 100)}%
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={meta.opacity ?? 0.12}
          onChange={(e) => onUpdate({ metadata: { ...meta, opacity: Number(e.target.value) } })}
          className="w-full"
        />
      </label>

      <button
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700 rounded"
        onClick={() => { onDelete(); onClose() }}
      >
        🗑️ Eliminar
      </button>
    </div>
  )
}
