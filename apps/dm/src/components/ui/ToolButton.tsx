import type { ReactNode } from 'react';

interface ToolButtonProps {
  /** Icono lucide. Va `aria-hidden`: el nombre accesible es solo `label`. */
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Tooltip. Por defecto el mismo `label`. */
  title?: string;
  testId?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Botón de las rails de herramientas (Capas y niebla, Acciones del DM).
 *
 * Antes cada control era un `<button>` con `text-xs px-2 py-1` y el emoji
 * clavado adentro del string de i18n (`'🧩 Zonas'`). Tres problemas: el emoji no
 * tiene area de click propia y descuadra la linea base, la fuente no trae todos
 * los glyphs (🌫️ salia como caja vacia) y el estado activo se distinguia solo por
 * el color del texto.
 *
 * El icono va aparte y el texto se mantiene en el DOM, asi que los locators por
 * nombre accesible (`getByRole('button', { name: /Niebla \(pincel\)/ })`) siguen
 * matcheando: matchean por substring y el SVG no aporta texto.
 */
export default function ToolButton({
  icon,
  label,
  active = false,
  onClick,
  title,
  testId,
  disabled = false,
  className = '',
}: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      data-testid={testId}
      aria-pressed={active}
      className={[
        'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs',
        'transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)]',
        active
          ? 'bg-[var(--bg-tertiary)] text-amber-300'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]',
        disabled ? 'cursor-not-allowed opacity-40' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left leading-5">{label}</span>
    </button>
  );
}