import { useState } from 'react'

interface BackgroundSuggestion {
  id: string
  name: string
  style: string
  colors: string[]
}

interface BackgroundSelectorProps {
  sceneType: string
  suggestions: BackgroundSuggestion[]
  dominantColors: string[]
  onSelect: (bgId: string) => void
  onUseDefault: () => void
  onClose: () => void
}

const SCENE_LABELS: Record<string, string> = {
  space: 'Space',
  forest: 'Forest',
  dungeon: 'Dungeon / Cave',
  tavern: 'Tavern / Interior',
  desert: 'Desert',
  water: 'Water / Ocean',
  night: 'Night',
  unknown: 'Unknown',
}

const SCENE_ICONS: Record<string, string> = {
  space: '\u{1F30C}',
  forest: '\u{1F332}',
  dungeon: '\u{1F576}',
  tavern: '\u{1F37A}',
  desert: '\u{1F3DC}',
  water: '\u{1F30A}',
  night: '\u{1F319}',
  unknown: '\u{2753}',
}

export function generateBackgroundCSS(sceneType: string, colors: string[]): string {
  const c = colors.length >= 3 ? colors : [colors[0] || '#1a1a2a', colors[0] || '#1a1a2a', colors[0] || '#1a1a2a']

  switch (sceneType) {
    case 'space':
      return `radial-gradient(ellipse at 30% 20%, ${c[1]}44 0%, ${c[0]} 60%), radial-gradient(1px 1px at 20% 30%, #fff 100%, transparent), radial-gradient(1px 1px at 40% 70%, #fff 100%, transparent), radial-gradient(1px 1px at 60% 20%, #fff 100%, transparent), radial-gradient(1px 1px at 80% 50%, #fff 100%, transparent), radial-gradient(1px 1px at 10% 80%, #fff 100%, transparent), radial-gradient(1px 1px at 90% 10%, #fff 100%, transparent), ${c[0]}`
    case 'forest':
      return `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2]} 100%)`
    case 'dungeon':
      return `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 40%, ${c[2]} 100%)`
    case 'tavern':
      return `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2]} 100%)`
    case 'desert':
      return `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2]} 100%)`
    case 'water':
      return `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2]} 100%)`
    case 'night':
      return `radial-gradient(ellipse at 70% 20%, #1a1a3a 0%, ${c[0]} 50%)`
    default:
      return c[0]
  }
}

export default function BackgroundSelector({
  sceneType,
  suggestions,
  dominantColors,
  onSelect,
  onUseDefault,
  onClose,
}: BackgroundSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded-lg shadow-2xl p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {SCENE_ICONS[sceneType] || '?'} Background for {SCENE_LABELS[sceneType] || sceneType}
          </h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl">
            &times;
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Map detected as <strong>{SCENE_LABELS[sceneType]}</strong>. Choose a matching background:
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {suggestions.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setSelected(bg.id)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                selected === bg.id
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                  : 'border-[var(--bg-tertiary)] hover:border-[var(--text-secondary)]'
              }`}
            >
              <div
                className="h-20 w-full"
                style={{
                  background: `linear-gradient(135deg, ${bg.colors[0]} 0%, ${bg.colors[1] || bg.colors[0]} 50%, ${bg.colors[2] || bg.colors[0]} 100%)`,
                }}
              />
              <div className="p-2 bg-[var(--bg-tertiary)]">
                <p className="text-xs font-medium text-[var(--text-primary)]">{bg.name}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">{bg.style}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[var(--text-secondary)]">Dominant colors:</span>
          {dominantColors.map((color, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border border-[var(--bg-tertiary)]"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
              selected
                ? 'bg-[var(--accent)] text-white hover:opacity-90'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
            }`}
          >
            Apply Background
          </button>
          <button
            onClick={onUseDefault}
            className="px-4 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Use Default
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
