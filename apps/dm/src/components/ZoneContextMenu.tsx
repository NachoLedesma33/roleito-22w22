import { useEffect, useRef, useState } from 'react'
import { PortalRef, SceneItem, ZoneMetadata, ZoneTrigger } from '@core/domain/types'
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

/**
 * Los triggers que la DM puede colgar a una zona. No es una lista cerrada:
 * el campo es el tipo de evento del bus, asi que un DM puede escribir el
 * que quiera. Estos son los atajos.
 */
const TRIGGER_TYPES = [
  { type: 'trap.triggered', label: 'Trampa' },
  { type: 'encounter.started', label: 'Encuentro' },
  { type: 'door.closed', label: 'La puerta se cierra' },
  { type: 'zone.entered', label: 'Entrada a la zona' },
  { type: 'lore.revealed', label: 'Se revela un secreto' },
]

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

  /**
   * Editar una zona que propuso la IA la marca como tocada por el DM: su
   * edicion manda sobre la deteccion (y la re-deteccion no le pisa encima).
   */
  const patch = (changes: Partial<ZoneMetadata>) => {
    const tocado = meta.origin === 'ai' ? true : meta.touchedByDm
    onUpdate({ metadata: { ...meta, ...changes, touchedByDm: tocado } })
  }

  const [nuevoTrigger, setNuevoTrigger] = useState(TRIGGER_TYPES[0].type)
  const triggers = meta.triggers ?? []

  const setTriggers = (next: ZoneTrigger[]) => patch({ triggers: next })

  const agregarTrigger = () => {
    setTriggers([
      ...triggers,
      { id: `trg-${Date.now()}`, eventType: nuevoTrigger, enabled: true },
    ])
  }

  const inputClass =
    'w-full bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

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
          onChange={(e) => patch({ shadowOnly: e.target.checked })}
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
          onChange={(e) => patch({ lineOfSight: e.target.checked })}
        />
        Tapa la vista
      </label>
      <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={meta.movement !== false}
          onChange={(e) => patch({ movement: e.target.checked })}
        />
        Bloquea el movimiento
      </label>
      {/* Las herramientas del Modo Manual sobre la zona: lo que el DM ajusto
          manda sobre la propuesta de la IA (por eso `patch` la marca como
          tocada). */}
      <div className="px-3 py-2 space-y-2 border-t border-gray-800">
        <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
          Nombre
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nombre de la zona"
            aria-label="Nombre de la zona"
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
          Relleno
          <span className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={meta.fillColor}
              onChange={(e) => patch({ fillColor: e.target.value })}
              aria-label="Color de relleno"
              className="h-7 w-10 cursor-pointer rounded border border-gray-600 bg-transparent"
            />
            <span className="font-mono text-[0.65rem] text-primary">{meta.fillColor}</span>
          </span>
        </label>
        <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
          Opacidad: {Math.round((meta.fillOpacity ?? 0.3) * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={meta.fillOpacity ?? 0.3}
            onChange={(e) => patch({ fillOpacity: Number(e.target.value) })}
            className="w-full mt-1"
          />
        </label>
      </div>
      {/* Triggers: cuando un token entra en la zona, se emite este evento en
          el bus de la campana. */}
      <div className="px-3 py-2 space-y-2 border-t border-gray-800">
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-secondary">Triggers</p>
        {triggers.length === 0 ? (
          <p className="text-[0.65rem] text-secondary">Ninguno: entrar a la zona no dispara nada.</p>
        ) : (
          triggers.map((trg) => (
            <div key={trg.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={trg.enabled}
                aria-label={`Activar ${trg.eventType}`}
                onChange={(e) =>
                  setTriggers(
                    triggers.map((t) => (t.id === trg.id ? { ...t, enabled: e.target.checked } : t)),
                  )
                }
              />
              <span className="font-mono text-[0.65rem] text-gray-200 flex-1 truncate">
                {trg.eventType}
              </span>
              <button
                type="button"
                aria-label={`Quitar ${trg.eventType}`}
                onClick={() => setTriggers(triggers.filter((t) => t.id !== trg.id))}
                className="text-[0.65rem] text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          ))
        )}
        <div className="flex items-center gap-1">
          <select
            value={nuevoTrigger}
            aria-label="Tipo de trigger"
            onChange={(e) => setNuevoTrigger(e.target.value)}
            className="flex-1 rounded bg-[var(--bg-tertiary)] border border-[var(--bg-secondary)] px-1 py-1 text-[0.65rem] text-[var(--text-primary)]"
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarTrigger}
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[0.65rem] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            Agregar
          </button>
        </div>
      </div>
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700"
        onClick={() => { onDelete(); onClose() }}
      >
        🗑️ Eliminar zona
      </button>
    </div>
  )
}