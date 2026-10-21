import { useEffect, useRef } from 'react'
import { PortalRef, SceneItem, ZoneMetadata } from '@core/domain/types'
import { PORTAL_COLORS } from './ZonePortal'

interface ZoneContextMenuProps {
  x: number
  y: number
  item: SceneItem
  portals: PortalRef[]
  onUpdate: (patch: Partial<SceneItem>) => void
  onTogglePortal: (portalId: string) => void
  onDeletePortal: (portalId: string) => void
  onDelete: () => void
  onClose: () => void
}

function nextAction(p: PortalRef): string {
  switch (p.state) {
    case 'open': return 'Cerrar'
    case 'closed': return 'Bloquear'
    case 'locked': return 'Abrir'
  }
}

export default function ZoneContextMenu({
  x,
  y,
  item,
  portals,
  onUpdate,
  onTogglePortal,
  onDeletePortal,
  onDelete,
  onClose,
}: ZoneContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const meta = item.metadata as ZoneMetadata

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

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-900 border border-gray-600 rounded shadow-lg py-1 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {portals.length > 0 && (
        <>
          {portals.map((p) => (
            <div key={p.id} className="border-b border-gray-800">
              <button
                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
                onClick={() => { onTogglePortal(p.id); onClose() }}
              >
                <span className="mr-1.5 inline-block w-2 h-2 rounded-full" style={{ backgroundColor: PORTAL_COLORS[p.state] }} />
                Portal {nextAction(p)}
              </button>
              <button
                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700"
                onClick={() => { onDeletePortal(p.id); onClose() }}
              >
                🗑️ Quitar portal
              </button>
            </div>
          ))}
          <div className="border-t border-gray-700 my-1" />
        </>
      )}
      <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={meta.shadowOnly === true}
          onChange={(e) => onUpdate({ metadata: { ...meta, shadowOnly: e.target.checked } })}
        />
        Solo sombra (no frena ni tapa la vista)
      </label>
      {/* Los flags del BORDE de la zona: son los mismos que tiene un muro
          (la zona ES la pared). Antes no existian: la deteccion con IA
          dejaba el muro suelto al lado de la zona y la geometria vivia dos
          veces. */}
      <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={meta.lineOfSight !== false}
          onChange={(e) => onUpdate({ metadata: { ...meta, lineOfSight: e.target.checked } })}
        />
        Tapa la vista
      </label>
      <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={meta.movement !== false}
          onChange={(e) => onUpdate({ metadata: { ...meta, movement: e.target.checked } })}
        />
        Bloquea el movimiento
      </label>
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700"
        onClick={() => { onDelete(); onClose() }}
      >
        🗑️ Eliminar zona
      </button>
    </div>
  )
}