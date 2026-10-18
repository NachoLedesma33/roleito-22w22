import type { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  /** Nombre accesible. También va como `title` para el tooltip. */
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  testId?: string;
  className?: string;
}

/**
 * Botón de solo icono con área de click de 28x28.
 *
 * El patrón que había en el repo era `p-1` con un `h-3 w-3` adentro: 16x16 de
 * área real, por debajo del mínimo de 24px queTed WCAG 2.5.8 pide y por debajo
 * de lo que un dedo alcanza en táctil. El icono va `aria-hidden` y el nombre
 * accesible viene de `label`, asi que los locators por `getByRole` siguen
 * matcheando.
 */
export default function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  testId,
  className = '',
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-testid={testId}
      className={[
        'grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)]',
        'transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)]',
        active
          ? 'bg-amber-600 text-white'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
        disabled ? 'cursor-not-allowed opacity-40' : '',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true" className="grid place-items-center">
        {icon}
      </span>
    </button>
  );
}