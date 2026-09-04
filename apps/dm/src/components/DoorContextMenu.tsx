import { useEffect, useRef } from 'react'
import { DoorMetadata } from '@core/domain/types'

interface DoorContextMenuProps {
  x: number
  y: number
  doorState: DoorMetadata['state']
  onToggle: () => void
  onLock: () => void
  onUnlock: () => void
  onDelete: () => void
  onClose: () => void
}

export default function DoorContextMenu({
  x,
  y,
  doorState,
  onToggle,
  onLock,
  onUnlock,
  onDelete,
  onClose,
}: DoorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

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
      className="fixed z-50 bg-gray-900 border border-gray-600 rounded shadow-lg py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
        onClick={() => { onToggle(); onClose() }}
      >
        {doorState === 'open' ? '🚪 Cerrar' : '🚪 Abrir'}
      </button>
      {doorState === 'locked' ? (
        <button
          className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
          onClick={() => { onUnlock(); onClose() }}
        >
          🔓 Desbloquear
        </button>
      ) : (
        <button
          className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700"
          onClick={() => { onLock(); onClose() }}
        >
          🔒 Bloquear
        </button>
      )}
      <div className="border-t border-gray-700 my-1" />
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700"
        onClick={() => { onDelete(); onClose() }}
      >
        🗑️ Eliminar
      </button>
    </div>
  )
}
