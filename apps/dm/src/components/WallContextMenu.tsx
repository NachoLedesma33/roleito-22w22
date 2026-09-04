import { useEffect, useRef } from 'react'

interface WallContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onClose: () => void
}

export default function WallContextMenu({
  x,
  y,
  onDelete,
  onClose,
}: WallContextMenuProps) {
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
        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700"
        onClick={() => { onDelete(); onClose() }}
      >
        🗑️ Eliminar
      </button>
    </div>
  )
}
